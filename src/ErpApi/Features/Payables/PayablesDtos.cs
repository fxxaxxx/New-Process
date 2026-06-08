namespace ErpApi.Features.Payables;

// ---- 采购付款（供应商级挂账） ----
public sealed class PurchasePaymentLineDto
{ public string? 供应商编号 { get; set; } public string? 供应商名称 { get; set; } public decimal 付款金额 { get; set; } public decimal? 货款金额 { get; set; } public decimal? 尚欠金额 { get; set; } public string? 入仓单号 { get; set; } }
public sealed class PurchasePaymentCreateDto
{ public string? 入仓单号 { get; set; } public string? 备注 { get; set; } public List<PurchasePaymentLineDto> 明细 { get; set; } = []; }
public sealed class PurchasePaymentHeaderDto
{
    public long ID { get; set; }
    public string? 单号 { get; set; }
    public string? 入仓单号 { get; set; }
    public DateTime? 日期 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}
public sealed class PurchasePaymentLineRowDto
{
    public long ID { get; set; }
    public string? 入仓单号 { get; set; }
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public decimal? 货款金额 { get; set; }
    public decimal? 付款金额 { get; set; }
    public decimal? 尚欠金额 { get; set; }
    public string? 备注 { get; set; }
}
public sealed class PurchasePaymentDetailDto
{ public PurchasePaymentHeaderDto? 单头 { get; set; } public List<PurchasePaymentLineRowDto> 明细 { get; set; } = []; }

// ---- 发外加工付款（加工厂级挂账） ----
public sealed class OutsourcePaymentLineDto
{ public string? 加工厂编号 { get; set; } public string? 加工厂名称 { get; set; } public decimal 付款金额 { get; set; } public decimal? 货款金额 { get; set; } public decimal? 尚欠金额 { get; set; } public string? 发外单号 { get; set; } }
public sealed class OutsourcePaymentCreateDto
{ public string? 发外单号 { get; set; } public string? 备注 { get; set; } public List<OutsourcePaymentLineDto> 明细 { get; set; } = []; }
public sealed class OutsourcePaymentHeaderDto
{
    public long ID { get; set; }
    public string? 单号 { get; set; }
    public string? 发外单号 { get; set; }
    public DateTime? 日期 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}
public sealed class OutsourcePaymentLineRowDto
{
    public long ID { get; set; }
    public string? 发外单号 { get; set; }
    public string? 加工厂编号 { get; set; }
    public string? 加工厂名称 { get; set; }
    public decimal? 货款金额 { get; set; }
    public decimal? 付款金额 { get; set; }
    public decimal? 尚欠金额 { get; set; }
    public string? 备注 { get; set; }
}
public sealed class OutsourcePaymentDetailDto
{ public OutsourcePaymentHeaderDto? 单头 { get; set; } public List<OutsourcePaymentLineRowDto> 明细 { get; set; } = []; }

// ---- 应付对账 ----
public sealed class PayableSupplierRow
{ public string? 供应商编号 { get; set; } public string? 供应商名称 { get; set; } public decimal 入仓金额 { get; set; } public decimal 付款金额 { get; set; } public decimal 应付余额 { get; set; } }
public sealed class PayableFactoryRow
{ public string? 加工厂编号 { get; set; } public string? 加工厂名称 { get; set; } public decimal 回收金额 { get; set; } public decimal 付款金额 { get; set; } public decimal 应付余额 { get; set; } }
