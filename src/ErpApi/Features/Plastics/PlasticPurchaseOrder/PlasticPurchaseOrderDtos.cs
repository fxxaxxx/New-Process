namespace ErpApi.Features.Plastics.PlasticPurchaseOrder;

public sealed class PlasticPurchaseOrderHeaderDto
{
    public long ID { get; set; }
    public string 单号 { get; set; } = "";
    public DateTime? 日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 客户名称 { get; set; }
    public string? 交货地点 { get; set; }
    public string? 编号 { get; set; }
    public decimal? 数量 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticPurchaseOrderLineDto
{
    public long ID { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 模具编号 { get; set; }
    public decimal? 用量 { get; set; }
    public decimal? 套数 { get; set; }
    public decimal 数量 { get; set; }
    public string? 颜色 { get; set; }
    public string? 色粉号 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticPurchaseOrderDetailDto
{
    public PlasticPurchaseOrderHeaderDto? 单头 { get; set; }
    public List<PlasticPurchaseOrderLineDto> 明细 { get; set; } = new();
}

public sealed class PlasticPurchaseOrderCreateLineDto
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 模具编号 { get; set; }
    public decimal? 用量 { get; set; }
    public decimal? 套数 { get; set; }
    public decimal 数量 { get; set; }
    public string? 颜色 { get; set; }
    public string? 色粉号 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticPurchaseOrderCreateDto
{
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 客户名称 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 交货地点 { get; set; }
    public string? 编号 { get; set; }
    public string? 备注 { get; set; }
    public List<PlasticPurchaseOrderCreateLineDto> 明细 { get; set; } = new();
}

public sealed class PlasticPurchaseOrderBasisRow
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 模具编号 { get; set; }
    public decimal? 用量 { get; set; }
    public decimal? 套数 { get; set; }
    public string? 颜色 { get; set; }
    public string? 色粉号 { get; set; }
    public string? 用料名称 { get; set; }
}

public sealed class PlasticPurchaseProgressRow
{
    public DateTime? 订购日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 采购单号 { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 模具编号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 订购数量 { get; set; }
    public decimal? 入仓数量 { get; set; }
    public decimal? 欠数 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 审核 { get; set; }
}
