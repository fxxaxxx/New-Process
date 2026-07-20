namespace ErpApi.Features.Plastics.PlasticRawMaterialPurchaseOrder;

public sealed class PlasticRawMaterialPurchaseOrderHeaderDto
{
    public long ID { get; set; }
    public string 单号 { get; set; } = "";
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public DateTime? 订购日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticRawMaterialPurchaseOrderLineDto
{
    public long ID { get; set; }
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 单位 { get; set; }
    public string? 单价类型 { get; set; }
    public decimal 订货数量 { get; set; }
    public decimal? 单价 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticRawMaterialPurchaseOrderDetailDto
{
    public PlasticRawMaterialPurchaseOrderHeaderDto? 单头 { get; set; }
    public List<PlasticRawMaterialPurchaseOrderLineDto> 明细 { get; set; } = new();
}

public sealed class PlasticRawMaterialPurchaseOrderCreateLineDto
{
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 单位 { get; set; }
    public string? 单价类型 { get; set; }
    public decimal 订货数量 { get; set; }
    public decimal? 单价 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticRawMaterialPurchaseOrderCreateDto
{
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 备注 { get; set; }
    public List<PlasticRawMaterialPurchaseOrderCreateLineDto> 明细 { get; set; } = new();
}

public sealed class PlasticRawMaterialOrderReceiptStatRow
{
    public DateTime? 订购日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 订购单号 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 采购单价 { get; set; }
    public decimal? 单价HKDLb { get; set; }
    public decimal? 其他成本单价HKDLb { get; set; }
    public decimal 订货数量包 { get; set; }
    public decimal 订货金额HKD { get; set; }
    public decimal 入库数量包 { get; set; }
    public decimal 入库订货金额HKD { get; set; }
    public decimal 入库其他费用HKD { get; set; }
    public decimal 入库金额合计HKD { get; set; }
    public decimal 相关数量包 { get; set; }
    public decimal 相关金额HKD { get; set; }
}

public sealed class PlasticRawMaterialProgressDetailRow
{
    public DateTime? 订购日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 订购单号 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 产地 { get; set; }
    public decimal? 每包重量 { get; set; }
    public string? 单位 { get; set; }
    public string? 单价类型 { get; set; }
    public decimal? 订货数量 { get; set; }
    public DateTime? 入仓日期 { get; set; }
    public string? 入仓单号 { get; set; }
    public decimal? 入仓数量 { get; set; }
    public decimal? 总入仓数 { get; set; }
    public decimal? 相差数量 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
}

public sealed class PlasticRawMaterialPurchaseOrderQueryDetailRow
{
    public DateTime? 订购日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 单号 { get; set; }
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 产地 { get; set; }
    public string? 单位 { get; set; }
    public string? 单价类型 { get; set; }
    public decimal? 订货数量 { get; set; }
    public decimal? 单价 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 审核 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticRawMaterialPurchaseOrderQuerySummaryRow
{
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 产地 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 订货数量 { get; set; }
}
