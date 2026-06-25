using Dapper;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.Inventory;
using ErpApi.Engines.Posting;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticInventoryServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticInventoryService Svc() => new(Factory());

    private static void Seed(SqlConnection c)
    {
        Cleanup(c);
        c.Execute("INSERT INTO [塑胶入仓单]([单号],[仓库],[审核]) VALUES(N'SRINV01',N'塑胶仓','0')");
        c.Execute(@"INSERT INTO [塑胶入仓明细单]([单号],[仓库],[物料编号],[物料名称],[规格],[单位],[数量])
                    VALUES(N'SRINV01',N'塑胶仓',N'SIPM01',N'ABS粒',N'规A',N'kg',100)");
    }
    private static void Cleanup(SqlConnection c)
    {
        c.Execute("DELETE FROM [塑胶入仓明细单] WHERE [物料编号]=N'SIPM01'");
        c.Execute("DELETE FROM [塑胶入仓单] WHERE [单号]=N'SRINV01'");
    }

    [SkippableFact]
    public async Task Stock_zero_until_approved_then_plus_then_reverses()
    {
        using var c = fx.Open(); Seed(c);
        var engine = new PostingEngine(Factory(), new AuditLogger());
        try
        {
            Assert.Equal(0m, await Svc().StockOfAsync("SIPM01", null));

            Assert.True(await engine.ApproveAsync("塑胶入仓单", "SRINV01", "tester"));
            Assert.Equal(100m, await Svc().StockOfAsync("SIPM01", null));
            var list = await Svc().ListAsync("塑胶仓", "SIPM01");
            Assert.Contains(list, r => r.物料编号 == "SIPM01" && r.库存数量 == 100m && r.仓库 == "塑胶仓");

            Assert.True(await engine.UnapproveAsync("塑胶入仓单", "SRINV01", "tester"));
            Assert.Equal(0m, await Svc().StockOfAsync("SIPM01", null));
        }
        finally { Cleanup(c); }
    }
}
