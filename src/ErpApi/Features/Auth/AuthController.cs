using ErpApi.Engines.Authorization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
namespace ErpApi.Features.Auth;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(AuthService auth, IPermissionService perm) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResult>> Login([FromBody] LoginRequest req)
    {
        var r = await auth.LoginAsync(req.用户, req.密码);
        return r.成功 ? Ok(r) : Unauthorized(r);
    }

    [HttpGet("me/permissions")]
    [Authorize]
    public async Task<IActionResult> MyPermissions()
    {
        var name = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub")!;
        return Ok(await perm.GetByUserAsync(name));
    }
}
