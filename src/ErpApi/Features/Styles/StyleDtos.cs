using ErpApi.Data.Entities;
namespace ErpApi.Features.Styles;

public sealed record StyleColorDto(string? 颜色编号, string? 颜色名称);

// BOM物料设置一行（用量=使用数量，材料=物料类别；工模编号/备注原表无对应单据列→不持久）
public sealed record StyleMaterialDto(
    string? 物料编号, string? 物料名称, string? 物料类别,
    string? 规格, string? 颜色, string? 单位, decimal? 使用数量);

// BOM物料设置保存载荷：单头（客户/日期/单位，逐行落库）+ 明细行。
// 工模编号/默认单价/类型/备注 为 UI-only，无对应持久列，不在此 DTO。
public sealed record BomSaveDto(
    string? 客户编号, string? 客户名称, DateTime? 日期, string? 单位,
    List<StyleMaterialDto> 明细);

// BOM物料设置 轻量载入：仅 款式 + 物料明细(避免拉颜色/尺码/工序,提速)
public sealed record StyleMaterialsViewDto(string 款号, string? 款式, IReadOnlyList<款号物料明细表> 物料);

public sealed record StyleFullDto(
    款号总表 主档,
    IReadOnlyList<StyleColorDto> 颜色,
    IReadOnlyList<string> 尺码,
    IReadOnlyList<款号明细表> 工序,
    IReadOnlyList<款号物料明细表> 物料);
