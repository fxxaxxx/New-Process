using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Plastics.PlasticMaterialDoc;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticMaterialDocDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticMaterialDocService Svc() => new(Factory(), new DocumentNumberGenerator());

    private static void Seed(SqlConnection c)
    {
        Cleanup(c);
        c.Execute("IF NOT EXISTS(SELECT 1 FROM [款号总表] WHERE [款号]=N'K1') INSERT INTO [款号总表]([款号],[款式]) VALUES(N'K1',N'塑胶测试款')");
        c.Execute("INSERT INTO [生产制单]([生产单号],[款号],[款式],[客户名称],[日期],[计划数量],[审核]) VALUES(N'SLMO01',N'K1',N'童装',N'TONY','2026-06-15',100,'1')");
        c.Execute("INSERT INTO [生产制单货号]([生产单号],[序号],[货号],[BOM款号],[数量]) VALUES(N'SLMO01',1,N'SLG01',N'K1',100)");
        c.Execute("INSERT INTO [塑胶物料资料]([物料编号],[物料名称],[仓位号],[单位]) VALUES(N'SLPM01',N'ABS粒',N'A-09',N'kg')");
        c.Execute(@"INSERT INTO [塑胶共用物料表]([客户],[塑胶货号],[工模编号],[物料名称],[颜色],[用料名称],[加工内容],[加工单价],[用量],[物料编号])
            VALUES(N'TONY',N'SLG01',N'M01',N'黑壳',N'黑',N'ABS',N'注塑',5,1.5,N'SLPM01'),
                  (N'TONY',N'SLG01',N'M02',N'白壳',N'白',N'PP',N'注塑',6,2.0,N'SLPM02')");
    }
    private static void Cleanup(SqlConnection c)
    {
        c.Execute("DELETE FROM [塑胶物料明细单] WHERE [生产单号]=N'SLMO01'");
        c.Execute("DELETE FROM [塑胶物料单] WHERE [生产单号]=N'SLMO01'");
        c.Execute("DELETE FROM [塑胶共用物料表] WHERE [塑胶货号]=N'SLG01'");
        c.Execute("DELETE FROM [塑胶物料资料] WHERE [物料编号]=N'SLPM01'");
        c.Execute("DELETE FROM [生产制单货号] WHERE [生产单号]=N'SLMO01'");
        c.Execute("DELETE FROM [生产制单] WHERE [生产单号]=N'SLMO01'");
        c.Execute("DELETE FROM [款号总表] WHERE [款号]=N'K1'");
    }

    [SkippableFact]
    public async Task Orders_filters_by_date_and_keyword()
    {
        using var c = fx.Open(); Seed(c);
        try
        {
            var page = await Svc().OrdersAsync(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30), "SLMO01", 1, 20);
            Assert.Contains(page.Items, r => r.生产单号 == "SLMO01" && r.客户名称 == "TONY");
            var none = await Svc().OrdersAsync(new DateTime(2026, 7, 1), new DateTime(2026, 7, 31), "SLMO01", 1, 20);
            Assert.DoesNotContain(none.Items, r => r.生产单号 == "SLMO01");
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task Basis_pulls_from_common_table_by_货号_with_仓位号()
    {
        using var c = fx.Open(); Seed(c);
        try
        {
            var basis = await Svc().BasisAsync("SLMO01");
            Assert.Equal(2, basis.Count);
            var r = Assert.Single(basis, x => x.物料编号 == "SLPM01");
            Assert.Equal("SLG01", r.货号);
            Assert.Equal("M01", r.工模编号);
            Assert.Equal("A-09", r.仓位号);
            Assert.Equal(5m, r.加工单价);
            Assert.Equal(1.5m, r.用量);
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task Create_then_Get_computes_金额_and_合计_then_Delete()
    {
        using var c = fx.Open(); Seed(c);
        string? 单号 = null;
        try
        {
            var dto = new PlasticMaterialDocCreateDto
            {
                生产单号 = "SLMO01", 货号 = "SLG01", 客户 = "TONY",
                明细 = [
                    new PlasticMaterialDocCreateLineDto { 工模编号 = "M01", 物料编号 = "SLPM01", 物料名称 = "ABS粒", 颜色 = "黑", 仓位号 = "A-09", 加工单价 = 5, 用量 = 1.5m, 订购数量 = 10 },
                    new PlasticMaterialDocCreateLineDto { 工模编号 = "M02", 物料编号 = "SLPM02", 物料名称 = "PP粒", 颜色 = "白", 加工单价 = 6, 用量 = 2.0m, 订购数量 = 20 },
                ]
            };
            单号 = await Svc().CreateAsync(dto, "tester");
            Assert.StartsWith("SL", 单号);

            var detail = await Svc().GetAsync(单号);
            Assert.NotNull(detail);
            Assert.Equal(30m, detail!.单头!.数量);
            Assert.Equal(170m, detail.单头!.金额);
            Assert.Equal(2, detail.明细.Count);
            var l1 = Assert.Single(detail.明细, x => x.物料编号 == "SLPM01");
            Assert.Equal(50m, l1.金额);
            Assert.Equal("A-09", l1.仓位号);

            Assert.True(await Svc().DeleteAsync(单号));
            Assert.Null(await Svc().GetAsync(单号));
            单号 = null;
        }
        finally
        {
            if (单号 != null) { c.Execute("DELETE FROM [塑胶物料明细单] WHERE [单号]=@n", new { n = 单号 }); c.Execute("DELETE FROM [塑胶物料单] WHERE [单号]=@n", new { n = 单号 }); }
            Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task Create_rejects_empty_lines()
    {
        using var c = fx.Open();
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(
            new PlasticMaterialDocCreateDto { 生产单号 = "SLMO01", 明细 = [] }, "tester"));
    }
}
