using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Inventory;
using ErpApi.Features.Materials.MaterialStocktake;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class MaterialStocktakeServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private MaterialStocktakeService Svc() => new(Factory(), new DocumentNumberGenerator(), new MaterialInventoryService(Factory()));

    private static void SeedStock(Microsoft.Data.SqlClient.SqlConnection c)
    {
        Cleanup(c);
        c.Execute("INSERT INTO [物料资料]([物料编号],[物料名称],[规格],[单位],[单价]) VALUES(N'PDM01',N'盘点料',N'规格A',N'米',10)");
        c.Execute("INSERT INTO [采购入仓单]([单号],[仓库],[审核]) VALUES(N'PDRK01',N'物料仓','1')");
        c.Execute(@"INSERT INTO [采购入仓明细单]([单号],[仓库],[物料编号],[物料名称],[规格],[单位],[数量])
                    VALUES(N'PDRK01',N'物料仓',N'PDM01',N'盘点料',N'规格A',N'米',100)");
    }
    private static void Cleanup(Microsoft.Data.SqlClient.SqlConnection c)
    {
        c.Execute("DELETE FROM [盘点明细单] WHERE [物料编号]=N'PDM01'");
        c.Execute("DELETE FROM [盘点单] WHERE [单号] LIKE N'PD%' AND [仓库]=N'物料仓' AND [单号] NOT LIKE N'PDRK%'");
        c.Execute("DELETE FROM [采购入仓明细单] WHERE [物料编号]=N'PDM01'");
        c.Execute("DELETE FROM [采购入仓单] WHERE [单号]=N'PDRK01'");
        c.Execute("DELETE FROM [物料资料] WHERE [物料编号]=N'PDM01'");
    }

    [SkippableFact]
    public async Task Basis_returns_system_qty()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        SeedStock(c);
        try
        {
            var basis = await Svc().BasisAsync("物料仓");
            var row = Assert.Single(basis, b => b.物料编号 == "PDM01");
            Assert.Equal(100m, row.系统数量);
            Assert.Equal("米", row.单位);
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task Create_computes_盈亏_and_GetReadsBack()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        SeedStock(c);
        string? pd = null;
        try
        {
            pd = await Svc().CreateAsync(new MaterialStocktakeCreateDto
            {
                仓库 = "物料仓",
                明细 = [ new MaterialStocktakeLineDto {
                    物料编号 = "PDM01", 物料名称 = "盘点料", 规格 = "规格A", 单位 = "米",
                    系统数量 = 100, 盘点数量 = 80 } ]
            }, "tester");
            Assert.StartsWith("PD", pd);
            Assert.Equal(-20m, c.ExecuteScalar<decimal>(
                "SELECT CAST([盈亏数量] AS decimal(18,4)) FROM [盘点明细单] WHERE [单号]=@n", new { n = pd }));
            var detail = await Svc().GetAsync(pd);
            var line = Assert.Single(detail!.明细);
            Assert.Equal(100m, line.系统数量);
            Assert.Equal(80m, line.盘点数量);
            Assert.Equal(-20m, line.盈亏数量);
        }
        finally
        {
            if (pd != null) { c.Execute("DELETE FROM [盘点明细单] WHERE [单号]=@n", new { n = pd }); c.Execute("DELETE FROM [盘点单] WHERE [单号]=@n", new { n = pd }); }
            Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task StocktakeQuery_detail_and_summary_carry_盈亏_and_金额()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        SeedStock(c);
        string? pd = null;
        try
        {
            // 系统100 盘点80 → 盈亏-20；物料资料单价10 → 金额=盈亏×单价=-200
            pd = await Svc().CreateAsync(new MaterialStocktakeCreateDto
            {
                仓库 = "物料仓",
                明细 = [ new MaterialStocktakeLineDto {
                    物料编号 = "PDM01", 物料名称 = "盘点料", 规格 = "规格A", 单位 = "米",
                    系统数量 = 100, 盘点数量 = 80 } ]
            }, "tester");

            var detail = await Svc().StocktakeQueryDetailAsync(null, null, "PDM01", null, null);
            var dr = Assert.Single(detail, r => r.单号 == pd);
            Assert.Equal(100m, dr.系统数量);
            Assert.Equal(80m, dr.盘点数量);
            Assert.Equal(-20m, dr.盈亏数量);
            Assert.Equal(10m, dr.单价);
            Assert.Equal(-200m, dr.金额);
            Assert.Equal("规格A", dr.规格);

            var summary = await Svc().StocktakeQuerySummaryAsync(null, null, "PDM01", null, null);
            var sr = Assert.Single(summary, r => r.物料编号 == "PDM01" && r.规格 == "规格A");
            Assert.Equal(-20m, sr.盈亏数量);
            Assert.Equal(-200m, sr.金额);
        }
        finally
        {
            if (pd != null) { c.Execute("DELETE FROM [盘点明细单] WHERE [单号]=@n", new { n = pd }); c.Execute("DELETE FROM [盘点单] WHERE [单号]=@n", new { n = pd }); }
            Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task StocktakeQuery_approval_filter_excludes_unapproved()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        SeedStock(c);
        string? pd = null;
        try
        {
            pd = await Svc().CreateAsync(new MaterialStocktakeCreateDto
            {
                仓库 = "物料仓",
                明细 = [ new MaterialStocktakeLineDto {
                    物料编号 = "PDM01", 物料名称 = "盘点料", 规格 = "规格A", 单位 = "米",
                    系统数量 = 100, 盘点数量 = 80 } ]
            }, "tester");
            // 新建即未审核：审核情况="已审核"应过滤掉，"未审核"应保留
            Assert.DoesNotContain(await Svc().StocktakeQueryDetailAsync(null, null, "PDM01", null, "已审核"), r => r.单号 == pd);
            Assert.Contains(await Svc().StocktakeQueryDetailAsync(null, null, "PDM01", null, "未审核"), r => r.单号 == pd);
        }
        finally
        {
            if (pd != null) { c.Execute("DELETE FROM [盘点明细单] WHERE [单号]=@n", new { n = pd }); c.Execute("DELETE FROM [盘点单] WHERE [单号]=@n", new { n = pd }); }
            Cleanup(c);
        }
    }

    [SkippableFact]
    public async Task Create_rejects_empty_lines()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(
            new MaterialStocktakeCreateDto { 仓库 = "物料仓", 明细 = [] }, "tester"));
    }

    [SkippableFact]
    public async Task Create_rejects_blank_warehouse()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(
            new MaterialStocktakeCreateDto { 仓库 = "", 明细 = [ new MaterialStocktakeLineDto { 物料编号 = "PDM01", 系统数量 = 1, 盘点数量 = 1 } ] }, "tester"));
    }
}
