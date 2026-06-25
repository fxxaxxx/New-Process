using Dapper;
using ErpApi.Features.Plastics.PlasticCommonMaterial;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticCommonMaterialDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticCommonMaterialService Svc() => new(Factory());

    private static void Seed(SqlConnection c)
    {
        Cleanup(c);
        c.Execute(@"INSERT INTO [塑胶共用物料表]([客户],[塑胶货号],[工模编号],[物料名称],[颜色],[用料名称],[加工单价],[用量],[物料编号],[调整审核])
            VALUES(N'TONY',N'PG001',N'M01',N'黑色车头壳',N'黑色',N'ABS',5,1.5,N'PM001',N'1'),
                  (N'TONY',N'PG001',N'M02',N'后壳',N'白色',N'ABS',6,2.0,N'PM002',N'0'),
                  (N'KING',N'PG002',N'M01',N'面壳',N'红色',N'PP',4,1.0,N'PM003',N'1')");
    }
    private static void Cleanup(SqlConnection c)
        => c.Execute("DELETE FROM [塑胶共用物料表] WHERE [物料编号] IN (N'PM001',N'PM002',N'PM003')");

    [SkippableFact]
    public async Task List_filters_by_塑胶货号()
    {
        using var c = fx.Open(); Seed(c);
        try
        {
            var page = await Svc().ListAsync(null, "PG001", null, null, null, 1, 20);
            Assert.Equal(2, page.Total);
            Assert.All(page.Items, r => Assert.Equal("PG001", r.塑胶货号));
            Assert.Contains(page.Items, r => r.物料编号 == "PM001" && r.工模编号 == "M01" && r.用量 == 1.5m);
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task List_filters_by_客户_and_keyword()
    {
        using var c = fx.Open(); Seed(c);
        try
        {
            var byCust = await Svc().ListAsync("KING", null, null, null, null, 1, 20);
            Assert.Equal("PG002", Assert.Single(byCust.Items).塑胶货号);
            var byKw = await Svc().ListAsync(null, null, null, "面壳", null, 1, 20);
            Assert.Equal("PM003", Assert.Single(byKw.Items).物料编号);
        }
        finally { Cleanup(c); }
    }

    [SkippableFact]
    public async Task List_filters_by_审核情况()
    {
        using var c = fx.Open(); Seed(c);
        try
        {
            var approved = await Svc().ListAsync(null, "PG001", null, null, "已审核", 1, 20);
            Assert.Equal("PM001", Assert.Single(approved.Items).物料编号);
            var unapproved = await Svc().ListAsync(null, "PG001", null, null, "未审核", 1, 20);
            Assert.Equal("PM002", Assert.Single(unapproved.Items).物料编号);
        }
        finally { Cleanup(c); }
    }
}
