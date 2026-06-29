using Dapper;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Posting;
using ErpApi.Features.Plastics.PlasticPurchaseOrder;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticPurchaseOrderServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticPurchaseOrderService Svc() => new(Factory(), new DocumentNumberGenerator());

    private static void Seed(SqlConnection c)
    {
        Clean(c);
        c.Execute("IF NOT EXISTS(SELECT 1 FROM [款号总表] WHERE [款号]=N'K-PO') INSERT INTO [款号总表]([款号],[款式]) VALUES(N'K-PO',N'塑胶采购订单测试款')");
        c.Execute("INSERT INTO [生产制单]([生产单号],[款号],[日期],[计划数量]) VALUES(N'PO-MO',N'K-PO','2026-06-29',100)");
        c.Execute("INSERT INTO [生产制单货号]([生产单号],[货号]) VALUES(N'PO-MO',N'H-PO')");
        c.Execute("INSERT INTO [塑胶共用物料表]([塑胶货号],[工模编号],[物料编号],[物料名称],[颜色],[色粉号],[用料名称],[用量],[套数]) VALUES(N'H-PO',N'GM-PO',N'POPM',N'ABS粒',N'黑',N'C1',N'用A',2,3)");
        c.Execute("INSERT INTO [塑胶物料资料]([物料编号],[物料名称],[单位]) VALUES(N'POPM',N'ABS粒',N'kg')");
    }

    private static void Clean(SqlConnection c)
    {
        c.Execute("DELETE FROM [塑胶采购订单明细] WHERE [物料编号]=N'POPM'");
        c.Execute("DELETE h FROM [塑胶采购订单] h JOIN [塑胶采购订单明细] d ON d.[单号]=h.[单号] WHERE d.[物料编号]=N'POPM'");
        c.Execute("DELETE FROM [塑胶采购订单] WHERE [客户名称]=N'PO测试客户'");
        c.Execute("DELETE FROM [塑胶共用物料表] WHERE [塑胶货号]=N'H-PO'");
        c.Execute("DELETE FROM [塑胶物料资料] WHERE [物料编号]=N'POPM'");
        c.Execute("DELETE FROM [生产制单货号] WHERE [生产单号]=N'PO-MO'");
        c.Execute("DELETE FROM [生产制单] WHERE [生产单号]=N'PO-MO'");
        c.Execute("DELETE FROM [款号总表] WHERE [款号]=N'K-PO'");
    }

    private static PlasticPurchaseOrderCreateDto MakeDto() => new()
    {
        供应商编号 = "S01",
        供应商名称 = "PO测试供应商",
        客户名称 = "PO测试客户",
        明细 =
        {
            new() { 生产单号 = "PO-MO", 款号 = "K-PO", 物料编号 = "POPM", 物料名称 = "ABS粒", 模具编号 = "GM-PO", 用量 = 2, 套数 = 3, 数量 = 5, 颜色 = "黑", 色粉号 = "C1", 用料名称 = "用A" },
            new() { 生产单号 = "PO-MO", 款号 = "K-PO", 物料编号 = "POPM", 物料名称 = "ABS粒", 模具编号 = "GM-PO", 用量 = 2, 套数 = 3, 数量 = 3, 颜色 = "黑", 色粉号 = "C1", 用料名称 = "用A" },
        }
    };

    [SkippableFact]
    public async Task Basis_brings_bom_then_Create_then_Get()
    {
        using var c = fx.Open(); Seed(c);
        try
        {
            var basis = await Svc().BasisAsync("PO-MO");
            var b = Assert.Single(basis);
            Assert.Equal("GM-PO", b.模具编号);
            Assert.Equal(3m, b.套数);
            Assert.Equal("C1", b.色粉号);
            Assert.Equal("K-PO", b.款号);
            Assert.Equal("ABS粒", b.物料名称);

            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.StartsWith("SP", 单号);

            var d = await Svc().GetAsync(单号);
            Assert.NotNull(d);
            Assert.Equal(8m, d!.单头!.数量);
            Assert.Equal(2, d.明细.Count);
            Assert.Equal("POPM", d.明细[0].物料编号);
            Assert.Equal("GM-PO", d.明细[0].模具编号);
            Assert.Equal(5m, d.明细[0].数量);
            Assert.Equal(3m, d.明细[1].数量);
        }
        finally { Clean(c); }
    }

    [SkippableFact]
    public async Task Approve_flips_审核_and_writes_审核日期()
    {
        using var c = fx.Open(); Seed(c);
        var engine = new PostingEngine(Factory(), new AuditLogger());
        try
        {
            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.True(await engine.ApproveAsync("塑胶采购订单", 单号, "tester"));

            var d = await Svc().GetAsync(单号);
            Assert.Equal("1", d!.单头!.审核);
            var 审核日期 = c.ExecuteScalar<DateTime?>("SELECT [审核日期] FROM [塑胶采购订单] WHERE [单号]=@单号", new { 单号 });
            Assert.NotNull(审核日期);
        }
        finally { Clean(c); }
    }

    [SkippableFact]
    public async Task Delete_approved_throws()
    {
        using var c = fx.Open(); Seed(c);
        var engine = new PostingEngine(Factory(), new AuditLogger());
        try
        {
            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.True(await engine.ApproveAsync("塑胶采购订单", 单号, "tester"));
            await Assert.ThrowsAsync<InvalidOperationException>(() => Svc().DeleteAsync(单号));
        }
        finally { Clean(c); }
    }
}
