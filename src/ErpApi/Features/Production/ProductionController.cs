using System.Security.Claims;
using ErpApi.Engines.Authorization;
using ErpApi.Engines.Posting;
using ErpApi.Infrastructure.Db;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
namespace ErpApi.Features.Production;

[ApiController]
[Authorize]
[Route("api/production")]
public sealed class ProductionController(
    ProductionService svc, MoTrackingService mo, IPostingEngine posting, IPermissionService perms,
    IAuditLogger audit, ISqlConnectionFactory factory) : ControllerBase
{
    private const string Menu = "生产制单";
    private const string Table = "生产制单";

    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";
    private Task<bool> AllowAsync(PermissionAction a) => perms.HasAsync(CurrentUser, Menu, a);

    // 审计在业务事务提交后写入(不参与回滚)——与 MasterCrudController 同一项目级权衡
    private async Task AuditAsync(string behavior, string record)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        await audit.WriteAsync(Table, behavior, CurrentUser, record, c);
    }

    // 成本保密：无"单价"权限时剥离一切价格/金额字段（后端落实）
    private static void MaskHeader(ProductionHeaderDto h)
    { h.工序单价 = null; h.物料金额 = null; h.出货单价 = null; }

    private static void MaskDetail(ProductionDetailDto d)
    {
        if (d.单头 is not null) MaskHeader(d.单头);
        foreach (var p in d.工序) p.单价 = null;
        foreach (var b in d.物料) { b.预算单价 = null; b.金额 = null; }
    }

    [HttpGet]
    public async Task<IActionResult> List(int page = 1, int size = 20, string? keyword = null)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        var result = await svc.ListAsync(page, size, keyword);
        if (!await AllowAsync(PermissionAction.单价))
            foreach (var h in result.Items) MaskHeader(h);
        return Ok(result);
    }

    [HttpGet("{生产单号}")]
    public async Task<IActionResult> Get(string 生产单号)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        var d = await svc.GetAsync(生产单号);
        if (d is null) return NotFound();
        if (!await AllowAsync(PermissionAction.单价)) MaskDetail(d);
        return Ok(d);
    }

    // 领料应领明细(供领料单按生产单一键带入):档=来料/塑胶 过滤档案
    [HttpGet("{生产单号}/issue-basis")]
    public async Task<IActionResult> IssueBasis(string 生产单号, string? 档 = null)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        return Ok(await svc.IssueBasisAsync(生产单号, 档));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] ProductionNoticeCreateDto dto)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        string 生产单号;
        try { 生产单号 = await svc.CreateAsync(dto, CurrentUser); }
        catch (ArgumentException ex) { return BadRequest(new { 消息 = ex.Message }); }
        catch (SqlException ex) when (ex.Number == 547)  // FK 违反
        { return BadRequest(new { 消息 = "款号/客户/加工厂不存在，请先在基础资料中建立。" }); }
        await AuditAsync("新增", $"单号={生产单号}");
        return CreatedAtAction(nameof(Get), new { 生产单号 }, new { 生产单号 });
    }

    [HttpDelete("{生产单号}")]
    public async Task<IActionResult> Delete(string 生产单号)
    {
        if (!await AllowAsync(PermissionAction.删除)) return Forbid();
        try
        {
            if (!await svc.DeleteAsync(生产单号)) return NotFound();
        }
        catch (InvalidOperationException ex) { return Conflict(new { 消息 = ex.Message }); }
        await AuditAsync("删除", $"单号={生产单号}");
        return NoContent();
    }

    // —— MO单录入（生产通知单MO单；独立保存，不参与主单据创建/审核流程） ——
    [HttpGet("{生产单号}/mo")]
    public async Task<IActionResult> GetMo(string 生产单号)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        return Ok(await mo.GetAsync(生产单号));
    }

    [HttpPut("{生产单号}/mo")]
    public async Task<IActionResult> SaveMo(string 生产单号, [FromBody] List<MoLineDto> rows)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        await mo.SaveAsync(生产单号, rows ?? []);
        await AuditAsync("保存MO单", $"单号={生产单号}");
        return NoContent();
    }

    [HttpPost("{生产单号}/approve")]
    public async Task<IActionResult> Approve(string 生产单号)
    {
        if (!await AllowAsync(PermissionAction.审核)) return Forbid();
        if (!await posting.ApproveAsync(Table, 生产单号, CurrentUser))
            return Conflict(new { 消息 = "审核失败：单不存在或已审核。" });
        return NoContent();
    }

    [HttpPost("{生产单号}/unapprove")]
    public async Task<IActionResult> Unapprove(string 生产单号)
    {
        if (!await AllowAsync(PermissionAction.反审核)) return Forbid();
        if (!await posting.UnapproveAsync(Table, 生产单号, CurrentUser))
            return Conflict(new { 消息 = "反审核失败：单不存在或未审核。" });
        return NoContent();
    }
}
