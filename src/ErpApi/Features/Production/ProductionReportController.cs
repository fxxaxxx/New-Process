using System.Security.Claims;
using ErpApi.Engines.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.Production;

// 生产管理只读报表：BOM物料查询 / BOM货号查询 / 货号接单汇总表。全部 gate 在「生产制单·打开」。
[ApiController]
[Authorize]
[Route("api/production-reports")]
public sealed class ProductionReportController(
    ProductionReportService svc, IPermissionService perms) : ControllerBase
{
    private const string Menu = "生产制单";
    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";

    [HttpGet("bom-materials")]
    public async Task<IActionResult> BomMaterials(string? keyword = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.BomMaterialsAsync(keyword));
    }

    [HttpGet("bom-styles")]
    public async Task<IActionResult> BomStyles(string? keyword = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.BomStylesAsync(keyword));
    }

    [HttpGet("order-summary")]
    public async Task<IActionResult> OrderSummary(string? keyword = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.OrderSummaryAsync(keyword));
    }
}
