using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.Orders;
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

    private ProductionService Svc() =>
        new(Factory(), new DocumentNumberGenerator(),
            new ErpApi.Engines.Inventory.MaterialInventoryService(Factory()));

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

    [SkippableFact]
    public async Task Create_expands_bom_with_shortage_算法4()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        P2TestData.Seed(c);

        var 生产单号 = await Svc().CreateAsync(Dto(), "tester");
        // 计划数量 = 100；BOM: 面料用量2(单价10)、纽扣用量0.5(单价0.2)

        // === 算法4 断言 ===
        // 面料需求 = 2 × 100 = 200；库存 0 → 需订 200；金额 = 200×10 = 2000
        var 面料 = c.QueryFirst(
            "SELECT * FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 AND [物料编号]=N'P2TM01'",
            new { 生产单号 });
        Assert.Equal(200m, (decimal)面料.总数量);
        Assert.Equal(0m, (decimal)面料.库存数量);
        Assert.Equal(200m, (decimal)面料.需订数量);
        Assert.Equal(10m, (decimal)面料.预算单价);
        Assert.Equal(2000m, (decimal)面料.金额);

        // 纽扣需求 = 0.5 × 100 = 50；金额 = 50×0.2 = 10
        var 纽扣 = c.QueryFirst(
            "SELECT * FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 AND [物料编号]=N'P2TM02'",
            new { 生产单号 });
        Assert.Equal(50m, (decimal)纽扣.总数量);
        Assert.Equal(50m, (decimal)纽扣.需订数量);
        Assert.Equal(10m, (decimal)纽扣.金额);

        // 单头物料金额 = 2000 + 10 = 2010
        Assert.Equal(2010m, c.ExecuteScalar<decimal>(
            "SELECT [物料金额] FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }));

        P2TestData.Cleanup(c);
    }

    [SkippableFact]
    public async Task Create_bom_deducts_material_stock_when_available()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        P2TestData.Seed(c);

        // 模拟已审核采购入仓 120 米面料（库存扣减验证：需求200 - 库存120 = 需订80）
        c.Execute("DELETE FROM [采购入仓明细单] WHERE [单号]=N'P2TCG01'");
        c.Execute("DELETE FROM [采购入仓单] WHERE [单号]=N'P2TCG01'");
        c.Execute("INSERT INTO [采购入仓单]([单号],[审核]) VALUES(N'P2TCG01','1')");
        c.Execute(@"INSERT INTO [采购入仓明细单]([单号],[物料编号],[物料名称],[数量])
                    VALUES(N'P2TCG01',N'P2TM01',N'P2面料',120)");

        var 生产单号 = await Svc().CreateAsync(Dto(), "tester");

        var 面料 = c.QueryFirst(
            "SELECT * FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 AND [物料编号]=N'P2TM01'",
            new { 生产单号 });
        Assert.Equal(200m, (decimal)面料.总数量);
        Assert.Equal(120m, (decimal)面料.库存数量);
        Assert.Equal(80m, (decimal)面料.需订数量);   // 缺料 = 需求 - 库存

        c.Execute("DELETE FROM [采购入仓明细单] WHERE [单号]=N'P2TCG01'");
        c.Execute("DELETE FROM [采购入仓单] WHERE [单号]=N'P2TCG01'");
        P2TestData.Cleanup(c);
    }

    [SkippableFact]
    public async Task Create_from_order_links_生产单号_back_to_order()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        P2TestData.Seed(c);

        // 先建一张订单
        var orderSvc = new OrderService(Factory(), new DocumentNumberGenerator());
        var 订单单号 = await orderSvc.CreateAsync(new OrderCreateDto
        {
            客户编号 = P2TestData.客户编号, 客户名称 = "P2测试客户",
            款号 = P2TestData.款号, 款式 = "P2测试款式", 单价 = 100m,
            明细 = [new OrderLineDto { 颜色 = "黑色", 尺码 = "S", 数量 = 100 }]
        }, "tester");

        // 从订单生成生产制单
        var dto = Dto();
        dto.订单单号 = 订单单号;
        var 生产单号 = await Svc().CreateAsync(dto, "tester");

        // 回写：订单总表/明细表 的 生产单号 字段被填上
        Assert.Equal(生产单号, c.ExecuteScalar<string>(
            "SELECT [生产单号] FROM [成品客户订单总表] WHERE [单号]=@订单单号", new { 订单单号 }));
        Assert.Equal(生产单号, c.ExecuteScalar<string>(
            "SELECT TOP 1 [生产单号] FROM [成品客户订单明细表] WHERE [单号]=@订单单号", new { 订单单号 }));

        P2TestData.Cleanup(c);
    }

    [SkippableFact]
    public async Task List_Get_and_Delete_production_order()
    {
        Skip.IfNot(fx.Available, "未设置 ERP_TEST_DB");
        using var c = fx.Open();
        P2TestData.Seed(c);
        var 生产单号 = await Svc().CreateAsync(Dto(), "tester");

        // 列表
        var page = await Svc().ListAsync(1, 20, 生产单号);
        Assert.Equal(1, page.Total);
        Assert.Equal(生产单号, page.Items[0].生产单号);

        // 详情：单头 + 3行数量 + 2道工序 + 2行BOM
        var detail = await Svc().GetAsync(生产单号);
        Assert.NotNull(detail);
        Assert.Equal(P2TestData.款号, detail!.单头!.款号);
        Assert.Equal(3, detail.数量.Count);
        Assert.Equal(2, detail.工序.Count);
        Assert.Equal(2, detail.物料.Count);

        // 已审核不能删
        c.Execute("UPDATE [生产制单] SET [审核]='1' WHERE [生产单号]=@生产单号", new { 生产单号 });
        await Assert.ThrowsAsync<InvalidOperationException>(() => Svc().DeleteAsync(生产单号));

        // 反审核后可删，全部子表清空
        c.Execute("UPDATE [生产制单] SET [审核]='0' WHERE [生产单号]=@生产单号", new { 生产单号 });
        Assert.True(await Svc().DeleteAsync(生产单号));
        Assert.Equal(0, c.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }));
        Assert.Equal(0, c.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [生产制单工序表] WHERE [生产单号]=@生产单号", new { 生产单号 }));
        Assert.Equal(0, c.ExecuteScalar<int>(
            "SELECT COUNT(*) FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号", new { 生产单号 }));

        Assert.False(await Svc().DeleteAsync("SC不存在"));

        P2TestData.Cleanup(c);
    }
}
