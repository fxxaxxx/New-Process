namespace ErpApi.Features.Plastics.PlasticMaterialDoc;

// 塑胶采购分析·生产单行
public sealed class PlasticOrderRow
{
    public long ID { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 合同号 { get; set; }
    public string? 客户名称 { get; set; }
    public decimal? 计划数量 { get; set; }
    public DateTime? 日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public string? 审核 { get; set; }
}

// 塑胶物料单·带出基准行(从塑胶共用物料表 JOIN 生产制单货号;仓位号来自塑胶物料资料)
public sealed class PlasticMaterialBasisRow
{
    public string? 货号 { get; set; }
    public string? 工模编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 仓位号 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 加工内容 { get; set; }
    public decimal? 加工单价 { get; set; }
    public decimal? 用量 { get; set; }
}

public sealed class PlasticMaterialDocHeaderDto
{
    public long ID { get; set; }
    public string? 单号 { get; set; }
    public DateTime? 日期 { get; set; }
    public string? 生产单号 { get; set; }
    public string? 货号 { get; set; }
    public string? 客户 { get; set; }
    public decimal? 数量 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 操作员 { get; set; }
    public string? 审核 { get; set; }
    public string? 审核人 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticMaterialDocLineDto
{
    public long ID { get; set; }
    public string? 工模编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 仓位号 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 加工内容 { get; set; }
    public decimal? 加工单价 { get; set; }
    public decimal? 用量 { get; set; }
    public decimal? 订购数量 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 备注 { get; set; }
}

public sealed class PlasticMaterialDocDetailDto
{
    public PlasticMaterialDocHeaderDto? 单头 { get; set; }
    public List<PlasticMaterialDocLineDto> 明细 { get; set; } = [];
}

public sealed class PlasticMaterialDocCreateLineDto
{
    public string? 工模编号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 颜色 { get; set; }
    public string? 仓位号 { get; set; }
    public string? 用料名称 { get; set; }
    public string? 加工内容 { get; set; }
    public decimal? 加工单价 { get; set; }
    public decimal? 用量 { get; set; }
    public decimal 订购数量 { get; set; }
}

public sealed class PlasticMaterialDocCreateDto
{
    public string? 生产单号 { get; set; }
    public string? 货号 { get; set; }
    public string? 客户 { get; set; }
    public string? 备注 { get; set; }
    public List<PlasticMaterialDocCreateLineDto> 明细 { get; set; } = [];
}

public sealed class PlasticCustomerTypeStatRow
{
    public string? 客户 { get; set; }
    public string? 类型 { get; set; }
    public decimal 数量 { get; set; }
    public decimal? 金额 { get; set; }
}
