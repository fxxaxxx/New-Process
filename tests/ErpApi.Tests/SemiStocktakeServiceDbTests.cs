using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Inventory;
using ErpApi.Features.Warehouse.Semi;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class SemiStocktakeServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private SemiStocktakeService Svc() => new(Factory(), new DocumentNumberGenerator(), new InventorySummaryService(Factory()));

    [SkippableFact]
    public async Task Basis_snapshots_system_qty_then_create_computes_盈亏()
    {
        using var c = fx.Open();
        P5cTestData.Seed(c);
        // 先造库存：入仓70(单头审核'1', 明细无审核列)
        c.Execute("INSERT INTO [半成品入仓单]([单号],[仓库],[审核]) VALUES(N'P5CSBASE',N'P5c半成品仓','1')");
        c.Execute(@"INSERT INTO [半成品入仓明细单]([单号],[仓库],[生产单号],[款号],[物料编号],[物料名称],[规格],[颜色],[数量])
                    VALUES(N'P5CSBASE',N'P5c半成品仓',N'P5cSC01',N'P5cK01',N'P5cM1',N'P5c半成品料',N'规格A',N'黑色',70)");
        string? pd = null;
        try
        {
            var basis = await Svc().BasisAsync(P5cTestData.仓库);
            Assert.Single(basis);
            Assert.Equal(70m, basis[0].系统数量);

            pd = await Svc().CreateAsync(new SemiStocktakeCreateDto
            {
                仓库 = P5cTestData.仓库,
                明细 = [ new SemiStocktakeLineDto {
                    物料编号 = "P5cM1", 物料名称 = "P5c半成品料", 规格 = "规格A", 颜色 = "黑色",
                    系统数量 = 70, 盘点数量 = 68 } ]
            }, "tester");
            Assert.StartsWith("BP", pd);
            Assert.Equal(-2m, c.ExecuteScalar<decimal>("SELECT CAST([盈亏数量] AS decimal(18,4)) FROM [半成品盘点明细单] WHERE [单号]=@n", new { n = pd }));

            // 审核盘点(仅单头有审核列)后，库存 = 70 + (-2) = 68
            c.Execute("UPDATE [半成品盘点单] SET [审核]='1' WHERE [单号]=@n", new { n = pd });
            var inv = await new InventorySummaryService(Factory()).SemiFinishedAsync(P5cTestData.仓库);
            Assert.Equal(68m, inv[0].库存);
        }
        finally
        {
            if (pd != null) { c.Execute("DELETE FROM [半成品盘点明细单] WHERE [单号]=@n", new { n = pd }); c.Execute("DELETE FROM [半成品盘点单] WHERE [单号]=@n", new { n = pd }); }
            c.Execute("DELETE FROM [半成品入仓明细单] WHERE [单号]='P5CSBASE'");
            c.Execute("DELETE FROM [半成品入仓单] WHERE [单号]='P5CSBASE'");
            P5cTestData.Cleanup(c);
        }
    }
}
