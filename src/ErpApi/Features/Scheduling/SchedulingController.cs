using System.Security.Claims;
using ErpApi.Engines.Authorization;
using ErpApi.Infrastructure.Db;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.Scheduling;

[ApiController]
[Authorize]
[Route("api/scheduling")]
public sealed class SchedulingController(
    SchedulingService svc, IPermissionService perms,
    IAuditLogger audit, ISqlConnectionFactory factory) : ControllerBase
{
    private const string Menu = "生产排期";
    private const string Table = "生产排期";

    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";
    private Task<bool> AllowAsync(PermissionAction a) => perms.HasAsync(CurrentUser, Menu, a);

    // 审计在业务事务提交后写入(不参与回滚)——与 OrderController 同一项目级权衡
    private async Task AuditAsync(string behavior, string record)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        await audit.WriteAsync(Table, behavior, CurrentUser, record, c);
    }

    [HttpGet]
    public async Task<IActionResult> List(
        int page = 1, int size = 20, string? keyword = null,
        string? 排期客户 = null, string? 状态 = null,
        DateTime? 走货期从 = null, DateTime? 走货期至 = null, long? 批次ID = null)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        return Ok(await svc.ListAsync(page, size, keyword, 排期客户, 状态, 走货期从, 走货期至, 批次ID));
    }

    // 按排期表(文件)分类:行数/货号数/状态分布;keyword 可按货号/品名/PO号/文件名反查
    [HttpGet("files")]
    public async Task<IActionResult> Files(string? 排期客户 = null, string? keyword = null)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        return Ok(await svc.FilesAsync(排期客户, keyword));
    }

    [HttpGet("batches")]
    public async Task<IActionResult> Batches()
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        return Ok(await svc.BatchesAsync());
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary()
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        return Ok(await svc.SummaryAsync());
    }

    [HttpGet("customers")]
    public async Task<IActionResult> Customers()
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        return Ok(await svc.CustomersAsync());
    }

    // Excel 导入:前端解析/别名映射/推定状态后的行批量入库(重复行按自然键更新,非法行记入失败明细)
    // 行内含整行原始 JSON,ZURU 总排期 2 万行约 40MB → 放宽请求体上限
    [HttpPost("import")]
    [RequestSizeLimit(300_000_000)]
    public async Task<IActionResult> Import([FromBody] ScheduleImportRequest req)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        ScheduleImportResult result;
        try { result = await svc.ImportAsync(req, CurrentUser); }
        catch (ArgumentException ex) { return BadRequest(new { 消息 = ex.Message }); }
        await AuditAsync("导入",
            $"批次={result.批次ID},新增={result.新增},更新={result.更新},失败={result.失败}");
        return Ok(result);
    }

    [HttpDelete("batches/{批次ID:long}")]
    public async Task<IActionResult> DeleteBatch(long 批次ID)
    {
        if (!await AllowAsync(PermissionAction.删除)) return Forbid();
        if (!await svc.DeleteBatchAsync(批次ID)) return NotFound();
        await AuditAsync("删除", $"批次ID={批次ID}");
        return NoContent();
    }
}
