using System.Security.Claims;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.Inventory;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.Warehouse.Finished;

// 成品库存查询（算法1 实时聚合）。仅看库存数量，无价格字段，故只需"打开"权限。
[ApiController]
[Authorize]
[Route("api/finished-inventory")]
public sealed class FinishedInventoryController(
    IInventorySummaryService inventory, IPermissionService perms) : ControllerBase
{
    private const string Menu = "成品库存";
    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery(Name = "仓库")] string? 仓库 = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        var rows = await inventory.FinishedGoodsAsync(仓库 ?? "");
        return Ok(rows);
    }
}
