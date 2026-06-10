namespace ErpApi.Features.Production;

// BOM物料查询：款号物料明细表 平铺行
public sealed class BomMaterialRow
{
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 物料类别 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 使用数量 { get; set; }
}

// BOM货号查询：款号总表 + 物料项数
public sealed class BomStyleRow
{
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public decimal? 单价 { get; set; }
    public int 物料项数 { get; set; }
}

// 货号接单汇总表：成品客户订单明细表 按货号归集
public sealed class OrderSummaryRow
{
    public string? 货号 { get; set; }
    public string? 款式 { get; set; }
    public decimal? 接单数量 { get; set; }
    public int 订单数 { get; set; }
}

// 生产单跟踪表：生产制单 进度行（计划/裁床/录入/未完成数 + 审核完成状态）
public sealed class ProductionTrackingRow
{
    public string? 生产单号 { get; set; }
    public string? 标识 { get; set; }
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 客户编号 { get; set; }
    public string? 客户名称 { get; set; }
    public DateTime? 日期 { get; set; }
    public DateTime? 下单日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public decimal? 计划数量 { get; set; }
    public decimal? 裁床数量 { get; set; }
    public decimal? 录入数量 { get; set; }
    public decimal? 未完成数 { get; set; }
    public string? 装箱方式 { get; set; }
    public int? 订单总箱数 { get; set; }
    public string? 完成 { get; set; }
    public string? 审核 { get; set; }
}
