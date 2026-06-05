namespace ErpApi.Features.Warehouse.Finished;

// ---- 入仓 ----
public sealed class FinishedReceiptLineDto
{
    public string? 色号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal 数量 { get; set; }
    public decimal? 单价 { get; set; }
}
public sealed class FinishedReceiptCreateDto
{
    public string 仓库 { get; set; } = "";
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 床号 { get; set; }
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
    public string? 备注 { get; set; }
    public List<FinishedReceiptLineDto> 明细 { get; set; } = [];
}
public sealed class FinishedReceiptHeaderDto
{
    public long ID { get; set; }
    public string? 单号 { get; set; }
    public string? 仓库 { get; set; }
    public DateTime? 日期 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}
public sealed class FinishedReceiptLineRowDto
{
    public long ID { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 色号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 单价 { get; set; }
    public decimal? 金额 { get; set; }
}
public sealed class FinishedReceiptDetailDto
{
    public FinishedReceiptHeaderDto? 单头 { get; set; }
    public List<FinishedReceiptLineRowDto> 明细 { get; set; } = [];
}

// ---- 出仓 ----
public sealed class FinishedIssueLineDto
{
    public string? 色号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal 数量 { get; set; }
    public decimal? 单价 { get; set; }
}
public sealed class FinishedIssueCreateDto
{
    public string 仓库 { get; set; } = "";
    public string? 订单单号 { get; set; }
    public string? 客户编号 { get; set; }
    public string? 客户名称 { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 床号 { get; set; }
    public string? 备注 { get; set; }
    public List<FinishedIssueLineDto> 明细 { get; set; } = [];
}
public sealed class FinishedIssueHeaderDto
{
    public long ID { get; set; }
    public string? 单号 { get; set; }
    public string? 订单单号 { get; set; }
    public string? 客户名称 { get; set; }
    public string? 仓库 { get; set; }
    public DateTime? 日期 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}
public sealed class FinishedIssueLineRowDto
{
    public long ID { get; set; }
    public string? 款号 { get; set; }
    public string? 色号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 成本单价 { get; set; }
    public decimal? 成本金额 { get; set; }
    public decimal? 单价 { get; set; }
    public decimal? 金额 { get; set; }
}
public sealed class FinishedIssueDetailDto
{
    public FinishedIssueHeaderDto? 单头 { get; set; }
    public List<FinishedIssueLineRowDto> 明细 { get; set; } = [];
}

// ---- 盘点 ----
public sealed class FinishedStocktakeBasisRow
{
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 色号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal 系统数量 { get; set; }
}
public sealed class FinishedStocktakeLineDto
{
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 色号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal 系统数量 { get; set; }
    public decimal 盘点数量 { get; set; }
}
public sealed class FinishedStocktakeCreateDto
{
    public string 仓库 { get; set; } = "";
    public string? 备注 { get; set; }
    public List<FinishedStocktakeLineDto> 明细 { get; set; } = [];
}
public sealed class FinishedStocktakeHeaderDto
{
    public long ID { get; set; }
    public string? 单号 { get; set; }
    public string? 仓库 { get; set; }
    public DateTime? 日期 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}
public sealed class FinishedStocktakeLineRowDto
{
    public long ID { get; set; }
    public string? 款号 { get; set; }
    public string? 色号 { get; set; }
    public string? 颜色 { get; set; }
    public string? 尺码 { get; set; }
    public decimal? 系统数量 { get; set; }
    public decimal? 盘点数量 { get; set; }
    public decimal? 盈亏数量 { get; set; }
}
public sealed class FinishedStocktakeDetailDto
{
    public FinishedStocktakeHeaderDto? 单头 { get; set; }
    public List<FinishedStocktakeLineRowDto> 明细 { get; set; } = [];
}
