namespace ErpApi.Features.Plastics.PlasticProcessPurchaseOrder;

public sealed class PlasticProcessPurchaseOrderHeaderDto
{
    public long ID { get; set; }
    public string 单号 { get; set; } = "";
    public DateTime? 日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 加工厂编号 { get; set; }
    public string? 加工厂名称 { get; set; }
    public string? 客户名称 { get; set; }
    public string? 收货仓库 { get; set; }
    public string? 收货人 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticProcessPurchaseOrderLineDto
{
    public long ID { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 模具编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 加工内容 { get; set; }
    public decimal 数量 { get; set; }
    public decimal? 单价 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticProcessPurchaseOrderDetailDto
{
    public PlasticProcessPurchaseOrderHeaderDto? 单头 { get; set; }
    public List<PlasticProcessPurchaseOrderLineDto> 明细 { get; set; } = new();
}

public sealed class PlasticProcessPurchaseOrderCreateLineDto
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 模具编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 加工内容 { get; set; }
    public decimal 数量 { get; set; }
    public decimal? 单价 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticProcessPurchaseOrderCreateDto
{
    public string? 加工厂编号 { get; set; }
    public string? 加工厂名称 { get; set; }
    public string? 客户名称 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 收货仓库 { get; set; }
    public string? 收货人 { get; set; }
    public string? 备注 { get; set; }
    public List<PlasticProcessPurchaseOrderCreateLineDto> 明细 { get; set; } = new();
}

public sealed class PlasticProcessPurchaseOrderBasisRow
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 模具编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 加工内容 { get; set; }
    public decimal? 单价 { get; set; }
}

public sealed class PlasticProcessPurchaseQueryDetailRow
{
    public DateTime? 单据日期 { get; set; }
    public string? 单号 { get; set; }
    public string? 加工厂名称 { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 模具编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 加工内容 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 单价 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 备注 { get; set; }
    public string? 审核 { get; set; }
}

public sealed class PlasticProcessPurchaseQuerySummaryRow
{
    public string? 模具编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 共用物料 { get; set; }
    public string? 加工内容 { get; set; }
    public string? 物料类别 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 订购数量 { get; set; }
    public decimal? 总金额 { get; set; }
}
