using System.Security.Claims;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.Warehouse.Semi;

// 半成品库存查询（算法1 实时聚合，物料维度）。仅看库存数量，无价格字段，只需"打开"权限。
[ApiController]
[Authorize]
[Route("api/semi-inventory")]
public sealed class SemiInventoryController(
    IInventorySummaryService inventory, IPermissionService perms) : ControllerBase
{
    private const string Menu = "半成品库存";
    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery(Name = "仓库")] string? 仓库 = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        var rows = await inventory.SemiFinishedAsync(仓库 ?? "");
        return Ok(rows);
    }
}
