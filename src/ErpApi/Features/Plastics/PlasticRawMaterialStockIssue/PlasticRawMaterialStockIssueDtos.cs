namespace ErpApi.Features.Plastics.PlasticRawMaterialStockIssue;

public sealed class PlasticRawMaterialStockIssueHeaderDto
{
    public long ID { get; set; }
    public string 单号 { get; set; } = "";
    public string? 生产车间 { get; set; }
    public DateTime? 日期 { get; set; }
    public string? 电脑单号 { get; set; }
    public string? 领料备注 { get; set; }
    public string? 制单人 { get; set; }
    public string? 操作员 { get; set; }
    public decimal? 数量 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticRawMaterialStockIssueLineDto
{
    public long ID { get; set; }
    public string? 啤机生产单号 { get; set; }
    public DateTime? 开单日期 { get; set; }
    public string? 啤机外发单号 { get; set; }
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 产地 { get; set; }
    public decimal? 每包重量 { get; set; }
    public string? 单位 { get; set; }
    public decimal 数量 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticRawMaterialStockIssueDetailDto
{
    public PlasticRawMaterialStockIssueHeaderDto? 单头 { get; set; }
    public List<PlasticRawMaterialStockIssueLineDto> 明细 { get; set; } = new();
}

public sealed class PlasticRawMaterialStockIssueCreateLineDto
{
    public string? 啤机生产单号 { get; set; }
    public DateTime? 开单日期 { get; set; }
    public string? 啤机外发单号 { get; set; }
    public string? 原料编号 { get; set; }
    public string? 原料名称 { get; set; }
    public string? 产地 { get; set; }
    public decimal? 每包重量 { get; set; }
    public string? 单位 { get; set; }
    public decimal 数量 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticRawMaterialStockIssueCreateDto
{
    public string? 生产车间 { get; set; }
    public string? 电脑单号 { get; set; }
    public string? 领料备注 { get; set; }
    public string? 制单人 { get; set; }
    public string? 备注 { get; set; }
    public List<PlasticRawMaterialStockIssueCreateLineDto> 明细 { get; set; } = new();
}
