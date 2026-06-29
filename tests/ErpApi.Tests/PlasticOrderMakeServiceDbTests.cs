using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Plastics.PlasticMaterialDoc;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticOrderMakeServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticMaterialDocService Svc() => new(Factory(), new DocumentNumberGenerator());

    [SkippableFact]
    public async Task OrderMake_expands_approved_bom_by_production_order()
    {
        using var c = fx.Open();
        void Clean()
        {
            c.Execute("DELETE FROM [塑胶共用物料表] WHERE [塑胶货号]=N'H-OM'");
            c.Execute("DELETE FROM [塑胶物料资料] WHERE [物料编号]=N'OMPM'");
            c.Execute("DELETE FROM [生产制单货号] WHERE [生产单号]=N'OM-MO'");
            c.Execute("DELETE FROM [生产制单] WHERE [生产单号]=N'OM-MO'");
            c.Execute("DELETE FROM [款号总表] WHERE [款号]=N'K-OM'");
        }
        Clean();
        c.Execute("IF NOT EXISTS(SELECT 1 FROM [款号总表] WHERE [款号]=N'K-OM') INSERT INTO [款号总表]([款号],[款式]) VALUES(N'K-OM',N'塑胶订单制作测试款')");
        c.Execute("INSERT INTO [生产制单]([生产单号],[款号],[日期],[计划数量]) VALUES(N'OM-MO',N'K-OM','2026-06-10',100)");
        c.Execute("INSERT INTO [生产制单货号]([生产单号],[货号]) VALUES(N'OM-MO',N'H-OM')");
        c.Execute("INSERT INTO [塑胶共用物料表]([塑胶货号],[工模编号],[物料编号],[物料名称],[颜色],[用料名称],[加工单价],[用量],[调整审核]) VALUES(N'H-OM',N'GM01',N'OMPM',N'ABS粒',N'黑',N'原胶',3,2,N'1')");
        c.Execute("INSERT INTO [塑胶共用物料表]([塑胶货号],[工模编号],[物料编号],[物料名称],[颜色],[用料名称],[加工单价],[用量],[调整审核]) VALUES(N'H-OM',N'GM01',N'OMPM2',N'PP粒',N'白',N'原胶',5,4,N'0')");
        c.Execute("INSERT INTO [塑胶物料资料]([物料编号],[物料名称],[单位]) VALUES(N'OMPM',N'ABS粒',N'kg')");
        try
        {
            var rows = await Svc().OrderMakeListAsync(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30), "OMPM");
            var r = Assert.Single(rows);
            Assert.Equal("OMPM", r.物料编号);
            Assert.Equal("K-OM", r.款号);
            Assert.Equal("H-OM", r.塑胶货号);
            Assert.Equal("kg", r.单位);
            Assert.Equal(2m, r.用量);
            Assert.Equal(100m, r.计划数量);
            Assert.Equal(200m, r.订购数量);
            Assert.Equal(600m, r.金额);

            Assert.Empty(await Svc().OrderMakeListAsync(new DateTime(2026, 5, 1), new DateTime(2026, 5, 31), "OMPM"));
            Assert.Empty(await Svc().OrderMakeListAsync(new DateTime(2026, 6, 1), new DateTime(2026, 6, 30), "ZZZ"));
        }
        finally { Clean(); }
    }
}
