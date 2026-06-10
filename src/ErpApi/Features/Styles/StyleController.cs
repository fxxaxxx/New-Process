using System.Security.Claims;
using ErpApi.Engines.Authorization;
using ErpApi.Infrastructure.Db;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.Styles;

[ApiController]
[Authorize]
[Route("api/styles")]
public sealed class StyleController(
    StyleService svc, IPermissionService perms,
    IAuditLogger audit, ISqlConnectionFactory factory) : ControllerBase
{
    private const string Menu = "款号资料";
    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";
    private Task<bool> AllowAsync(PermissionAction a) => perms.HasAsync(CurrentUser, Menu, a);

    // 审计在业务事务提交后写入(不参与回滚)——与 MasterCrudController 同一项目级权衡
    private async Task AuditAsync(string table, string behavior, string record)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        await audit.WriteAsync(table, behavior, CurrentUser, record, c);
    }

    // 款式全貌（主档+颜色+尺码+工序+BOM）；无"单价"权限时剥离所有价格（成本保密）
    [HttpGet("{款号}/full")]
    public async Task<IActionResult> GetFull(string 款号)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        var dto = await svc.GetFullAsync(款号);
        if (dto is null) return NotFound();
        if (!await AllowAsync(PermissionAction.单价))
        {
            dto.主档.单价 = null; dto.主档.成本价 = null; dto.主档.批发价 = null; dto.主档.零售价 = null;
            foreach (var p in dto.工序) p.单价 = null;
        }
        return Ok(dto);
    }

    [HttpPut("{款号}/colors")]
    public async Task<IActionResult> PutColors(string 款号, [FromBody] List<StyleColorDto> colors)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        try { await svc.ReplaceColorsAsync(款号, colors); }
        catch (InvalidOperationException ex) { return NotFound(new { 消息 = ex.Message }); }
        await AuditAsync("款号颜色表", "修改", $"款号={款号}");
        return NoContent();
    }

    [HttpPut("{款号}/materials")]
    public async Task<IActionResult> PutMaterials(string 款号, [FromBody] BomSaveDto dto)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        try { await svc.ReplaceMaterialsAsync(款号, dto); }
        catch (InvalidOperationException ex) { return NotFound(new { 消息 = ex.Message }); }
        await AuditAsync("款号物料明细表", "修改", $"款号={款号}");
        return NoContent();
    }

    [HttpPut("{款号}/sizes")]
    public async Task<IActionResult> PutSizes(string 款号, [FromBody] List<string> sizes)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        try { await svc.ReplaceSizesAsync(款号, sizes); }
        catch (InvalidOperationException ex) { return NotFound(new { 消息 = ex.Message }); }
        await AuditAsync("款号尺码表", "修改", $"款号={款号}");
        return NoContent();
    }
}
