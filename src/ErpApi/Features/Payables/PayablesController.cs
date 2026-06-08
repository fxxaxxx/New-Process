using System.Security.Claims;
using ErpApi.Engines.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.Payables;

// 应付对账(算法5 只读报表)。有「应付对账」打开权限即看金额(不逐列脱敏)。
[ApiController]
[Authorize]
[Route("api/payables")]
public sealed class PayablesController(PayablesService svc, IPermissionService perms) : ControllerBase
{
    private const string Menu = "应付对账";
    private string CurrentUser => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";

    [HttpGet("supplier")]
    public async Task<IActionResult> Supplier([FromQuery(Name = "供应商编号")] string? 供应商编号 = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.SupplierAsync(供应商编号));
    }

    [HttpGet("factory")]
    public async Task<IActionResult> Factory([FromQuery(Name = "加工厂编号")] string? 加工厂编号 = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.FactoryAsync(加工厂编号));
    }
}
