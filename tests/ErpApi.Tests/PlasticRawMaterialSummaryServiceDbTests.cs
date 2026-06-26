using Dapper;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.Inventory;
using ErpApi.Engines.Posting;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticRawMaterialSummaryServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticInventoryService Svc() => new(Factory());

    [SkippableFact]
    public async Task RawMaterialSummary_current_stock_plus_period_scrap()
    {
        using var c = fx.Open();
        var engine = new PostingEngine(Factory(), new AuditLogger());
        void Clean()
        {
            c.Execute("DELETE FROM [塑胶入仓明细单] WHERE [物料名称]=N'RAWNAME'; DELETE FROM [塑胶入仓单] WHERE [单号]=N'RAW_R1'");
            c.Execute("DELETE FROM [塑胶报废明细单] WHERE [物料名称]=N'RAWNAME'; DELETE FROM [塑胶报废单] WHERE [单号] IN (N'RAW_B1',N'RAW_B0')");
        }
        Clean();
        c.Execute("INSERT INTO [塑胶入仓单]([单号],[日期],[仓库],[审核]) VALUES(N'RAW_R1','2026-06-05',N'原料仓','0')");
        c.Execute("INSERT INTO [塑胶入仓明细单]([单号],[仓库],[物料编号],[物料名称],[单位],[数量]) VALUES(N'RAW_R1',N'原料仓',N'RAWPM01',N'RAWNAME',N'kg',100)");
        c.Execute("INSERT INTO [塑胶报废单]([单号],[日期],[仓库],[审核]) VALUES(N'RAW_B1','2026-06-12',N'原料仓','0')");
        c.Execute("INSERT INTO [塑胶报废明细单]([单号],[仓库],[物料编号],[物料名称],[单位],[数量]) VALUES(N'RAW_B1',N'原料仓',N'RAWPM01',N'RAWNAME',N'kg',20)");
        c.Execute("INSERT INTO [塑胶报废单]([单号],[日期],[仓库],[审核]) VALUES(N'RAW_B0','2026-05-10',N'原料仓','0')");
        c.Execute("INSERT INTO [塑胶报废明细单]([单号],[仓库],[物料编号],[物料名称],[单位],[数量]) VALUES(N'RAW_B0',N'原料仓',N'RAWPM01',N'RAWNAME',N'kg',7)");
        try
        {
            await engine.ApproveAsync("塑胶入仓单", "RAW_R1", "t");
            await engine.ApproveAsync("塑胶报废单", "RAW_B1", "t");
            await engine.ApproveAsync("塑胶报废单", "RAW_B0", "t");
            var rows = await Svc().RawMaterialMonthlySummaryAsync(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30), "RAWNAME");
            var r = Assert.Single(rows, x => x.原料名称 == "RAWNAME");
            Assert.Equal(73m, r.本月库存);      // 入100 − 本月报废20 − 上月报废7
            Assert.Equal(0m, r.存外厂数量);
            Assert.Equal(20m, r.本月报废);       // 仅本月
            Assert.Equal(93m, r.本月总数);       // 73 + 20
        }
        finally { Clean(); }
    }
}
