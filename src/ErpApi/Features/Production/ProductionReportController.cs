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

    // 采购超数查询：每生产单×物料 已采购−BOM需求>0 列出超采
    [HttpGet("purchase-over")]
    public async Task<IActionResult> PurchaseOver(string? keyword = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.PurchaseOverAsync(keyword));
    }

    // 生产单跟踪表：进度报表（计划/裁床/录入/未完成数 + 审核完成筛选）
    [HttpGet("tracking")]
    public async Task<IActionResult> Tracking(
        string? keyword = null,
        [FromQuery(Name = "审核")] string? 审核 = null,
        [FromQuery(Name = "完成")] string? 完成 = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.TrackingAsync(keyword, 审核, 完成));
    }
}
