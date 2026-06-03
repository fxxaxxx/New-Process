using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Production;
using ErpApi.Infrastructure.Db;
using Microsoft.Extensions.Configuration;
using Xunit;

[Collection("db")]
public class ProductionServiceDbTests(DbFixture fx)
{
    private ISqlConnectionFactory Factory()
    {
        var cfg = new ConfigurationBuilder().AddInMemoryCollection(
            new Dictionary<string, string?> { ["Erp:ConnectionStringEnvVar"] = "ERP_TEST_DB" }).Build();
        return new SqlConnectionFactory(cfg);
    }

    private ProductionService Svc() => new(Factory(), new DocumentNumberGenerator());

    private static ProductionCreateDto Dto() => new()
    {
        款号 = P2TestData.款号, 款式 = "P2测试款式",
        客户编号 = P2TestData.客户编号, 客户名称 = "P2测试客户",
        加工厂编号 = P2TestData.加工厂编号, 加工厂名称 = "P2测试加工厂",
        交货日期 = new DateTime(2026, 8, 1), 出货单价 = 120m,
        数量明细 =
        [
            new ProductionQtyDto { 颜色 = "黑色", 尺码 = "S", 数量 = 40 },
            new ProductionQtyDto { 颜色 = "黑色", 尺码 = "M", 数量 = 30 },
            new ProductionQtyDto { 颜色 = "白色", 尺码 = "L", 数量 = 30 },
        ]
    };

    [SkippableFact]
    public async Task Create_writes_header_qty_and_expands_processes_算法3()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        P2TestData.Seed(c);

        var 生产单号 = await Svc().CreateAsync(Dto(), "tester");
        Assert.StartsWith("SC", 生产单号);   // 前缀SC+yyyyMMdd+流水

        // 单头：计划数量 = 100
        Assert.Equal(100m, c.ExecuteScalar<decimal>(
            "SELECT [计划数量] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }));

        // 数量明细 3 行
        Assert.Equal(3, c.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [生产制单数量] WHERE [生产单号]=@生产单号", new { 生产单号 }));

        // === 算法3 工序展开断言 ===
        // 款号有 2 道工序(裁床1.5 + 车缝2.5) → 复制到生产制单工序表
        Assert.Equal(2, c.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [生产制单工序表] WHERE [生产单号]=@生产单号", new { 生产单号 }));
        // 单头汇总：工序数=2，工序单价=4.0（单件工费）
        Assert.Equal(2m, Convert.ToDecimal(c.ExecuteScalar<object>(
            "SELECT [工序数] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 })));
        Assert.Equal(4.0m, c.ExecuteScalar<decimal>(
            "SELECT [工序单价] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }));
        // 计划工费 = 计划数量 × 单件工费 = 100 × 4 = 400（口径校验，不落库，由前端/报表算）
        var 工序单价 = c.ExecuteScalar<decimal>(
            "SELECT [工序单价] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 });
        var 计划数量 = c.ExecuteScalar<decimal>(
            "SELECT [计划数量] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 });
        Assert.Equal(400m, 工序单价 * 计划数量);
        // 复制的工序内容正确
        Assert.Equal(1.5m, c.ExecuteScalar<decimal>(
            "SELECT [单价] FROM [生产制单工序表] WHERE [生产单号]=@生产单号 AND [工序名称]=N'裁床'", new { 生产单号 }));

        // 新单未审核
        Assert.Equal("0", c.ExecuteScalar<string>(
            "SELECT [审核] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }));

        P2TestData.Cleanup(c);
    }

    [SkippableFact]
    public async Task Create_rejects_empty_qty_lines()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        var dto = Dto();
        dto.数量明细 = [];
        await Assert.ThrowsAsync<ArgumentException>(() => Svc().CreateAsync(dto, "tester"));
    }
}
