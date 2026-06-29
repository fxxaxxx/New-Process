using Dapper;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Posting;
using ErpApi.Features.Plastics.PlasticProcessPurchaseOrder;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticProcessPurchaseOrderServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticProcessPurchaseOrderService Svc() => new(Factory(), new DocumentNumberGenerator());

    private static void Seed(SqlConnection c)
    {
        Clean(c);
        c.Execute("IF NOT EXISTS(SELECT 1 FROM [款号总表] WHERE [款号]=N'K-PJ') INSERT INTO [款号总表]([款号],[款式]) VALUES(N'K-PJ',N'塑胶加工采购单测试款')");
        c.Execute("INSERT INTO [生产制单]([生产单号],[款号],[日期],[计划数量]) VALUES(N'PJ-MO',N'K-PJ','2026-06-29',100)");
        c.Execute("INSERT INTO [生产制单货号]([生产单号],[货号]) VALUES(N'PJ-MO',N'H-PJ')");
        c.Execute("INSERT INTO [塑胶共用物料表]([塑胶货号],[工模编号],[物料编号],[物料名称],[颜色],[用料名称],[加工内容],[加工单价]) VALUES(N'H-PJ',N'GM-PJ',N'PJPM',N'ABS粒',N'黑',N'用A',N'喷油',3)");
        c.Execute("INSERT INTO [塑胶物料资料]([物料编号],[物料名称],[单位]) VALUES(N'PJPM',N'ABS粒',N'kg')");
    }

    private static void Clean(SqlConnection c)
    {
        c.Execute("DELETE FROM [塑胶加工采购单明细] WHERE [物料编号]=N'PJPM'");
        c.Execute("DELETE h FROM [塑胶加工采购单] h JOIN [塑胶加工采购单明细] d ON d.[单号]=h.[单号] WHERE d.[物料编号]=N'PJPM'");
        c.Execute("DELETE FROM [塑胶加工采购单] WHERE [客户名称]=N'PJ测试客户'");
        c.Execute("DELETE FROM [塑胶共用物料表] WHERE [塑胶货号]=N'H-PJ'");
        c.Execute("DELETE FROM [塑胶物料资料] WHERE [物料编号]=N'PJPM'");
        c.Execute("DELETE FROM [生产制单货号] WHERE [生产单号]=N'PJ-MO'");
        c.Execute("DELETE FROM [生产制单] WHERE [生产单号]=N'PJ-MO'");
        c.Execute("DELETE FROM [款号总表] WHERE [款号]=N'K-PJ'");
    }

    private static PlasticProcessPurchaseOrderCreateDto MakeDto() => new()
    {
        加工厂编号 = "F01",
        加工厂名称 = "PJ测试加工厂",
        客户名称 = "PJ测试客户",
        明细 =
        {
            new() { 生产单号 = "PJ-MO", 款号 = "K-PJ", 模具编号 = "GM-PJ", 物料编号 = "PJPM", 物料名称 = "ABS粒", 用料名称 = "用A", 颜色 = "黑", 加工内容 = "喷油", 数量 = 5, 单价 = 3 },
            new() { 生产单号 = "PJ-MO", 款号 = "K-PJ", 模具编号 = "GM-PJ", 物料编号 = "PJPM", 物料名称 = "ABS粒", 用料名称 = "用A", 颜色 = "黑", 加工内容 = "喷油", 数量 = 3, 单价 = 3 },
        }
    };

    [SkippableFact]
    public async Task Basis_brings_bom_then_Create_then_Get()
    {
        using var c = fx.Open(); Seed(c);
        try
        {
            var basis = await Svc().BasisAsync("PJ-MO");
            var b = Assert.Single(basis);
            Assert.Equal("GM-PJ", b.模具编号);
            Assert.Equal("喷油", b.加工内容);
            Assert.Equal(3m, b.单价);
            Assert.Equal("K-PJ", b.款号);
            Assert.Equal("ABS粒", b.物料名称);

            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.StartsWith("SJ", 单号);

            var d = await Svc().GetAsync(单号);
            Assert.NotNull(d);
            Assert.Equal(8m, d!.单头!.数量);
            Assert.Equal(24m, d.单头!.金额);
            Assert.Equal(2, d.明细.Count);
            Assert.Equal("PJPM", d.明细[0].物料编号);
            Assert.Equal("GM-PJ", d.明细[0].模具编号);
            Assert.Equal(5m, d.明细[0].数量);
            Assert.Equal(15m, d.明细[0].金额);
            Assert.Equal(3m, d.明细[1].数量);
            Assert.Equal(9m, d.明细[1].金额);
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
            Assert.True(await engine.ApproveAsync("塑胶加工采购单", 单号, "tester"));

            var d = await Svc().GetAsync(单号);
            Assert.Equal("1", d!.单头!.审核);
            var 审核日期 = c.ExecuteScalar<DateTime?>("SELECT [审核日期] FROM [塑胶加工采购单] WHERE [单号]=@单号", new { 单号 });
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
            Assert.True(await engine.ApproveAsync("塑胶加工采购单", 单号, "tester"));
            await Assert.ThrowsAsync<InvalidOperationException>(() => Svc().DeleteAsync(单号));
        }
        finally { Clean(c); }
    }
}
