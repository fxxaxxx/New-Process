using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Plastics.PlasticReceipt;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticReceiptServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticReceiptService Svc() => new(Factory(), new DocumentNumberGenerator());

    private static PlasticReceiptCreateDto Dto() => new()
    {
        供应商编号 = "S1", 供应商名称 = "供A", 仓库 = "塑胶仓",
        明细 = [
            new PlasticReceiptCreateLineDto { 物料编号 = "SRPM01", 物料名称 = "ABS粒", 规格 = "规A", 单位 = "kg", 数量 = 10, 单价 = 5 },
            new PlasticReceiptCreateLineDto { 物料编号 = "SRPM02", 物料名称 = "PP粒", 单位 = "kg", 数量 = 20, 单价 = 6 },
        ]
    };

    [SkippableFact]
    public async Task Create_then_Get_computes_金额_then_Delete()
    {
        using var c = fx.Open();
        var 单号 = await Svc().CreateAsync(Dto(), "tester");
        try
        {
            Assert.StartsWith("SR", 单号);
            var d = await Svc().GetAsync(单号);
            Assert.Equal(30m, d!.单头!.数量);
            Assert.Equal(170m, d.单头!.金额);
            Assert.Equal(2, d.明细.Count);
            Assert.Equal(50m, Assert.Single(d.明细, x => x.物料编号 == "SRPM01").金额);
            Assert.True(await Svc().DeleteAsync(单号));
            Assert.Null(await Svc().GetAsync(单号));
            单号 = null!;
        }
        finally
        {
            if (单号 != null) { c.Execute("DELETE FROM [塑胶入仓明细单] WHERE [单号]=@n", new { n = 单号 }); c.Execute("DELETE FROM [塑胶入仓单] WHERE [单号]=@n", new { n = 单号 }); }
        }
    }

    [SkippableFact]
    public async Task Create_rejects_empty_lines_and_blank_warehouse()
    {
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(new PlasticReceiptCreateDto { 仓库 = "塑胶仓", 明细 = [] }, "tester"));
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(new PlasticReceiptCreateDto { 仓库 = "", 明细 = [ new PlasticReceiptCreateLineDto { 物料编号 = "X", 数量 = 1 } ] }, "tester"));
    }
}
