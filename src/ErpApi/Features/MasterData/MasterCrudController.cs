using System.Reflection;
using System.Security.Claims;
using ErpApi.Data.Entities;
using ErpApi.Engines.Authorization;
using ErpApi.Infrastructure.Db;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
namespace ErpApi.Features.MasterData;

[ApiController]
[Authorize]
public abstract class MasterCrudController<T>(
    MasterCrudService<T> svc, IPermissionService perms,
    IAuditLogger audit, ISqlConnectionFactory factory) : ControllerBase
    where T : MasterEntity
{
    protected abstract string Menu { get; }
    protected abstract string TableName { get; }

    private string CurrentUser =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? "";

    private Task<bool> AllowAsync(PermissionAction a) => perms.HasAsync(CurrentUser, Menu, a);

    // 标了 [PriceField] 的价格/成本属性(每个封闭泛型 T 只反射一次)
    private static readonly PropertyInfo[] PriceProps =
        typeof(T).GetProperties().Where(p => p.IsDefined(typeof(PriceFieldAttribute), false)).ToArray();

    // 成本保密:无"单价"权限时把价格字段置空后再返回(后端落实,不只前端隐藏)
    private async Task MaskPricesAsync(IEnumerable<T> items)
    {
        if (PriceProps.Length == 0) return;
        if (await AllowAsync(PermissionAction.单价)) return;
        foreach (var item in items)
            foreach (var p in PriceProps)
                p.SetValue(item, null);
    }

    private async Task AuditAsync(string behavior, string record)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        await audit.WriteAsync(TableName, behavior, CurrentUser, record, c);
    }

    [HttpGet]
    public async Task<IActionResult> List(int page = 1, int size = 20, string? keyword = null)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        var result = await svc.ListAsync(page, size, keyword);
        await MaskPricesAsync(result.Items);
        return Ok(result);
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id)
    {
        if (!await AllowAsync(PermissionAction.打开)) return Forbid();
        var e = await svc.GetAsync(id);
        if (e is null) return NotFound();
        await MaskPricesAsync(new[] { e });
        return Ok(e);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] T entity)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        var created = await svc.CreateAsync(entity);
        await AuditAsync("新增", $"ID={created.ID}");
        return CreatedAtAction(nameof(Get), new { id = created.ID }, created);
    }

    [HttpPut("{id:long}")]
    public async Task<IActionResult> Update(long id, [FromBody] T entity)
    {
        if (!await AllowAsync(PermissionAction.保存)) return Forbid();
        // 无"单价"权限者编辑:价格字段读取时被脱敏为 null，整实体覆盖会抹掉真实价格——从库回填原值保护
        if (PriceProps.Length > 0 && !await AllowAsync(PermissionAction.单价))
        {
            var existing = await svc.GetAsync(id);
            if (existing is null) return NotFound();
            foreach (var p in PriceProps) p.SetValue(entity, p.GetValue(existing));
        }
        if (!await svc.UpdateAsync(id, entity)) return NotFound();
        await AuditAsync("修改", $"ID={id}");
        return NoContent();
    }

    [HttpDelete("{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        if (!await AllowAsync(PermissionAction.删除)) return Forbid();
        if (!await svc.DeleteAsync(id)) return NotFound();
        await AuditAsync("删除", $"ID={id}");
        return NoContent();
    }
}
