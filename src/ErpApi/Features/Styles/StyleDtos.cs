using ErpApi.Data.Entities;
namespace ErpApi.Features.Styles;

public sealed record StyleColorDto(string? 颜色编号, string? 颜色名称);

public sealed record AssemblyMaterialExtensionDto(
    string? 产品装配名称, string? 配件编号, string? 共用物料编号,
    string? 装配方式, string? 类别, decimal? 库存单价HK, decimal? 其他成本HK,
    decimal? 需求用量, string? 单位, bool 半成品计算库存, string? 备注内容,
    bool 调整审核, string? 审核人, DateTime? 审核时间);

public sealed record AssemblyMaterialQuoteDto(
    long? ID, string? 物料编号, string? 物料名称, string 合作方类型,
    string? 合作方编号, string? 合作方名称, DateTime? 报价日期, string? 货币,
    decimal? 单价, decimal? 港币价, decimal? 对比相差, decimal? 相差比例,
    bool 是否默认, int 顺序, string? 备注);

// BOM物料设置一行（用量=使用数量，材料=物料类别）。
public sealed record StyleMaterialDto(
    string? 物料编号, string? 物料名称, string? 物料类别,
    string? 规格, string? 颜色, string? 单位, decimal? 使用数量,
    string? 工模编号 = null, string? 备注 = null);

// BOM物料设置保存载荷：单头（客户/日期/单位，逐行落库）+ 明细行。
public sealed record BomSaveDto(
    string? 客户编号, string? 客户名称, DateTime? 日期, string? 单位,
    List<StyleMaterialDto> 明细,
    AssemblyMaterialExtensionDto? 扩展 = null,
    List<AssemblyMaterialQuoteDto>? 报价 = null);

// BOM物料设置轻量载入：款式、物料行、装配扩展和报价。
public sealed record StyleMaterialsViewDto(
    string 款号, string? 款式, IReadOnlyList<款号物料明细表> 物料,
    AssemblyMaterialExtensionDto 扩展,
    IReadOnlyList<AssemblyMaterialQuoteDto> 报价);

public sealed record StyleFullDto(
    款号总表 主档,
    IReadOnlyList<StyleColorDto> 颜色,
    IReadOnlyList<string> 尺码,
    IReadOnlyList<款号明细表> 工序,
    IReadOnlyList<款号物料明细表> 物料);
