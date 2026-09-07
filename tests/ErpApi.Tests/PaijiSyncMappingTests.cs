using ErpApi.Integrations.Paiji;
using Xunit;

// 排产入库单 → ERP塑胶入仓单 反向同步映射的纯函数测试(不碰 HTTP/DB)。
public class PaijiSyncMappingTests
{
    [Theory]
    [InlineData("AT", "292", "兴信A(测试版)")]
    [InlineData("A", "101", "兴信A车间")]
    [InlineData("B", "102", "兴信B车间")]
    [InlineData("C", "112", "东莞华登塑胶制品有限公司")]
    [InlineData("W", "291", "外发部")]
    [InlineData("X", "291", "外发部")]   // 未知车间 → 外发部
    public void 车间供应商映射(string workshop, string 编号, string 名称)
    {
        var (no, name) = PaijiMapper.车间供应商(workshop);
        Assert.Equal(编号, no);
        Assert.Equal(名称, name);
    }

    [Fact]
    public void 单价换算_每啤价除以出模数()
    {
        var r = new PaijiWarehouseInRow { Id = 4, MoldNo = "92125", UnitPrice = 1.2m, Cavity = 6m, DeliveryPcs = 111111 };
        var line = PaijiMapper.ToReceiptLine(r, m => m);
        Assert.Equal(0.2m, line.单价);
    }

    [Fact]
    public void 单价换算_出模数空用原值()
    {
        var r = new PaijiWarehouseInRow { Id = 4, UnitPrice = 1.2m, Cavity = null };
        Assert.Equal(1.2m, PaijiMapper.ToReceiptLine(r, m => m).单价);
        r.Cavity = 0;
        Assert.Equal(1.2m, PaijiMapper.ToReceiptLine(r, m => m).单价);
    }

    [Fact]
    public void 单价为空则留空()
        => Assert.Null(PaijiMapper.ToReceiptLine(new PaijiWarehouseInRow { Id = 1, UnitPrice = null, Cavity = 6 }, m => m).单价);

    [Fact]
    public void 整行映射与物料编号委托()
    {
        var r = new PaijiWarehouseInRow
        {
            Id = 4, OrderNo = "2643939", MoldNo = "92125", PartName = "111", Color = "11111",
            DeliveryPcs = 111111, UnitPrice = null, Cavity = null,
        };
        var line = PaijiMapper.ToReceiptLine(r, m => m == "92125" ? "RBCEZ2-01M-01-暹罗猫" : m);
        Assert.Equal("2643939", line.生产单号);
        Assert.Equal("92125", line.款号);
        Assert.Equal("92125", line.塑胶货号);
        Assert.Equal("RBCEZ2-01M-01-暹罗猫", line.物料编号);   // 匹配委托命中
        Assert.Equal("111", line.物料名称);
        Assert.Equal("11111", line.颜色);
        Assert.Equal("PCS", line.单位);
        Assert.Equal(111111m, line.数量);
        Assert.Equal("排产#4", line.备注);

        // 匹配不到直接用 mold_no
        Assert.Equal("92125", PaijiMapper.ToReceiptLine(r, m => m).物料编号);
    }

    [Fact]
    public void 分组按送货单号_空则各自成组()
    {
        var rows = new[]
        {
            new PaijiWarehouseInRow { Id = 1, DeliveryCode = "111" },
            new PaijiWarehouseInRow { Id = 2, DeliveryCode = "111" },
            new PaijiWarehouseInRow { Id = 3, DeliveryCode = "222" },
            new PaijiWarehouseInRow { Id = 4, DeliveryCode = null },
            new PaijiWarehouseInRow { Id = 5, DeliveryCode = "  " },
        };
        var groups = PaijiMapper.入库分组(rows).ToList();
        Assert.Equal(4, groups.Count);  // 111×2 同组,222 一组,两个空各自成组
        Assert.Equal(2, groups.Single(g => g.Key == "111").Count());
        Assert.Single(groups.Single(g => g.Key == "222"));
        Assert.Contains(groups, g => g.Key == "#4");
        Assert.Contains(groups, g => g.Key == "#5");
    }
}
