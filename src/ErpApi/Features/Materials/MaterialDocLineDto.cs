namespace ErpApi.Features.Materials;

// 物料明细行（采购入仓/领料/退料 三单据共用）
public sealed class MaterialDocLineDto
{
    public long ID { get; set; }            // 读出用；创建时忽略
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 物料类别 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal 数量 { get; set; }
    public decimal? 单价 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 备注 { get; set; }
}
