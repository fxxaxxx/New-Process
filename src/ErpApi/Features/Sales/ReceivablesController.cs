using System.Security.Claims;
using ErpApi.Engines.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.Sales;

// 应收对账（算法5 只读报表）。有「应收对账」打开权限即授权看金额（财务报表本质是金额，不逐列脱敏）。
[ApiController]
[Authorize]
[Route("api/receivables")]
public sealed class ReceivablesController(ReceivablesService svc, IPermissionService perms) : ControllerBase
{
    private const string Menu = "应收对账";
    private string CurrentUser => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery(Name = "客户编号")] string? 客户编号 = null)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        return Ok(await svc.ListAsync(客户编号));
    }
}
