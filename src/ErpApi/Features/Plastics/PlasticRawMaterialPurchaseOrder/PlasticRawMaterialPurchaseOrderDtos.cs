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
