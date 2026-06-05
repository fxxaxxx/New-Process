using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Warehouse.Semi;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class SemiIssueServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private SemiIssueService Svc() => new(Factory(), new DocumentNumberGenerator());
    private static SemiIssueCreateDto Dto() => new()
    {
        仓库 = P5cTestData.仓库, 生产单号 = P5cTestData.生产单号, 款号 = P5cTestData.款号, 部门 = "车间一", 领料人 = "张三",
        明细 = [ new SemiIssueLineDto { 物料编号 = P5cTestData.物料编号, 物料名称 = "P5c半成品料", 规格 = "规格A", 颜色 = "黑色", 单位 = "件", 数量 = 30, 单价 = 10 } ]
    };

    [SkippableFact]
    public async Task Create_then_delete_lifecycle()
    {
        using var c = fx.Open();
        P5cTestData.Seed(c);
        var 单号 = await Svc().CreateAsync(Dto(), "tester");
        try
        {
            Assert.StartsWith("BL", 单号);
            Assert.Equal(30m, c.ExecuteScalar<decimal>("SELECT [数量] FROM [半成品领料单] WHERE [单号]=@n", new { n = 单号 }));
            Assert.Equal(300m, c.ExecuteScalar<decimal>("SELECT [金额] FROM [半成品领料明细单] WHERE [单号]=@n", new { n = 单号 }));
            Assert.Equal(1, (await Svc().ListAsync(1, 20, 单号)).Total);
            Assert.Equal(1, (await Svc().GetAsync(单号))!.明细.Count);
            Assert.True(await Svc().DeleteAsync(单号));
            Assert.False(await Svc().DeleteAsync("BL不存在"));
        }
        finally
        {
            c.Execute("DELETE FROM [半成品领料明细单] WHERE [单号]=@n", new { n = 单号 });
            c.Execute("DELETE FROM [半成品领料单] WHERE [单号]=@n", new { n = 单号 });
            P5cTestData.Cleanup(c);
        }
    }
}
