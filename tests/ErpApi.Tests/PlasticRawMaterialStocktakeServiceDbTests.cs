using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Plastics.PlasticRawMaterialStocktake;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class PlasticRawMaterialStocktakeServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }
    private PlasticRawMaterialStocktakeService Svc() => new(Factory(), new DocumentNumberGenerator());

    private static void Clean(SqlConnection c)
    {
        c.Execute("DELETE FROM [原料盘点明细单] WHERE [原料编号]=N'YPD-PM'");
        c.Execute("DELETE FROM [原料盘点单] WHERE [备注]=N'YPD测试盘点'");
        c.Execute("DELETE FROM [塑胶原料资料] WHERE [物料编号]=N'YPD-PM'");
    }
    private static void SeedMaterial(SqlConnection c, decimal 库存)
    {
        c.Execute("INSERT INTO [塑胶原料资料]([物料编号],[物料名称],[单位],[库存]) VALUES(N'YPD-PM',N'盘点测试原料',N'kg',@库存)", new { 库存 });
    }

    private static PlasticRawMaterialStocktakeCreateDto MakeDto() => new()
    {
        电脑单号 = "PC-YPD",
        备注 = "YPD测试盘点",
        明细 =
        {
            new() { 原料编号 = "YPD-PM", 原料名称 = "盘点测试原料", 产地 = "台湾", 每包重量 = 25, 单位 = "kg", 系统数量 = 100, 盘点数量 = 90 },
        }
    };

    [SkippableFact]
    public async Task Create_computes_盈亏()
    {
        using var c = fx.Open(); Clean(c);
        try
        {
            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.StartsWith("YPD", 单号);
            var d = await Svc().GetAsync(单号);
            Assert.NotNull(d);
            Assert.Single(d!.明细);
            Assert.Equal(100m, d.明细[0].系统数量);
            Assert.Equal(90m, d.明细[0].盘点数量);
            Assert.Equal(-10m, d.明细[0].盈亏数量);
            Assert.Equal("台湾", d.明细[0].产地);
        }
        finally { Clean(c); }
    }

    [SkippableFact]
    public async Task Approve_calibrates_库存_to_盘点数量()
    {
        using var c = fx.Open(); Clean(c); SeedMaterial(c, 100m);
        try
        {
            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.True(await Svc().ApproveAsync(单号, "tester"));
            var 库存 = c.ExecuteScalar<decimal?>("SELECT [库存] FROM [塑胶原料资料] WHERE [物料编号]=N'YPD-PM'");
            Assert.Equal(90m, 库存);   // 审核把账面校准为盘点数
            var d = await Svc().GetAsync(单号);
            Assert.Equal("1", d!.单头!.审核);
        }
        finally { Clean(c); }
    }

    [SkippableFact]
    public async Task Unapprove_does_not_rollback_库存()
    {
        using var c = fx.Open(); Clean(c); SeedMaterial(c, 100m);
        try
        {
            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.True(await Svc().ApproveAsync(单号, "tester"));
            Assert.True(await Svc().UnapproveAsync(单号, "tester"));
            var 库存 = c.ExecuteScalar<decimal?>("SELECT [库存] FROM [塑胶原料资料] WHERE [物料编号]=N'YPD-PM'");
            Assert.Equal(90m, 库存);   // 反审核不回滚,库存仍为盘点数
            var d = await Svc().GetAsync(单号);
            Assert.Equal("0", d!.单头!.审核);
        }
        finally { Clean(c); }
    }

    [SkippableFact]
    public async Task Delete_approved_throws()
    {
        using var c = fx.Open(); Clean(c); SeedMaterial(c, 100m);
        try
        {
            var 单号 = await Svc().CreateAsync(MakeDto(), "tester");
            Assert.True(await Svc().ApproveAsync(单号, "tester"));
            await Assert.ThrowsAsync<InvalidOperationException>(() => Svc().DeleteAsync(单号));
        }
        finally { Clean(c); }
    }
}
