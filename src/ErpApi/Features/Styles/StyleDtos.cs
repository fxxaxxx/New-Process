using ErpApi.Data.Entities;
namespace ErpApi.Features.Styles;

public sealed record StyleColorDto(string? 颜色编号, string? 颜色名称);

public sealed record StyleFullDto(
    款号总表 主档,
    IReadOnlyList<StyleColorDto> 颜色,
    IReadOnlyList<string> 尺码,
    IReadOnlyList<款号明细表> 工序,
    IReadOnlyList<款号物料明细表> 物料);
