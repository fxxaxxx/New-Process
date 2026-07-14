using System.Security.Claims;
using ErpApi.Engines.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ErpApi.Features.Warehouse.Semi.CommonMaterials;

[ApiController, Authorize, Route("api/semi-finished-common-materials")]
public sealed class SemiFinishedCommonMaterialController(
    SemiFinishedCommonMaterialService svc,
    IPermissionService perms) : ControllerBase
{
    private const string Menu = "半成品共用物料表";
    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] SemiFinishedCommonMaterialQuery query)
    {
        if (!await perms.HasAsync(CurrentUser, Menu, PermissionAction.打开)) return Forbid();
        var canSeePrice = await perms.HasAsync(CurrentUser, Menu, PermissionAction.单价);
        return Ok(await svc.ListAsync(query, canSeePrice));
    }
}
