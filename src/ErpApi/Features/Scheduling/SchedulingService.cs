using Dapper;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
namespace ErpApi.Features.Scheduling;

// 客户排期：各客户 Excel 排期表的导入/查询/批次管理。
// 重复导入按自然键(排期客户+PO号+客PO+SKU+货号+数量)更新状态与日期，保证重跑幂等、支持"在排→已走货"流转。
public sealed class SchedulingService(ISqlConnectionFactory factory)
{
    public const int MaxImportRows = 50000;   // 单文件行数上限(ZURU 总排期约 2 万行)

    // 分页列表：关键字模糊匹配 PO号/客PO/货号/品名/客户名称；另可按 排期客户/状态/走货期区间/批次 过滤
    public async Task<PagedResult<ScheduleRowDto>> ListAsync(
        int page, int size, string? keyword, string? 排期客户, string? 状态,
        DateTime? 走货期从, DateTime? 走货期至, long? 批次ID = null)
    {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 1000) size = 1000;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cust = string.IsNullOrWhiteSpace(排期客户) ? null : 排期客户.Trim();
        var st = string.IsNullOrWhiteSpace(状态) ? null : 状态.Trim();

        const string where = @"
WHERE (@kw IS NULL OR [PO号] LIKE @kw OR [客PO] LIKE @kw OR [货号] LIKE @kw OR [品名] LIKE @kw OR [客户名称] LIKE @kw OR [SKU] LIKE @kw OR [原始数据] LIKE @kw)
  AND (@cust IS NULL OR [排期客户]=@cust)
  AND (@st IS NULL OR [状态]=@st)
  AND (@from IS NULL OR [走货期]>=@from)
  AND (@to IS NULL OR [走货期]<DATEADD(day,1,@to))
  AND (@bid IS NULL OR [批次ID]=@bid)";

        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync($@"
SELECT COUNT(*) FROM [生产排期] {where};
SELECT [ID],[批次ID],[排期客户],[状态],[接单日期],[客户名称],[国家],[PO号],[客PO],[SKU],[货号],[品名],
       [数量],[内箱],[外箱],[总箱数],[走货期],[验货期],[第三方验货],[车间],[来源工作表],[备注],[原始数据],[创建日期],[操作员]
FROM [生产排期] {where}
ORDER BY [走货期] DESC, [ID] DESC
OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { kw, cust, st, from = 走货期从, to = 走货期至, bid = 批次ID, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<ScheduleRowDto>()).AsList();
        return new PagedResult<ScheduleRowDto>(items, total);
    }

    // 排期表(文件)分类视图:一个批次一张卡,带行数/货号数/状态分布;
    // keyword 命中 文件名/货号/品名 → 反查"哪些货号在哪些排期表"
    public async Task<IReadOnlyList<ScheduleFileDto>> FilesAsync(string? 排期客户, string? keyword)
    {
        var cust = string.IsNullOrWhiteSpace(排期客户) ? null : 排期客户.Trim();
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        var items = await c.QueryAsync<ScheduleFileDto>(@"
SELECT b.[ID],b.[排期客户],b.[文件名],b.[导入日期],b.[操作员],
       COUNT(s.[ID]) AS [行数],
       COUNT(DISTINCT s.[货号]) AS [货号数],
       SUM(CASE WHEN s.[状态]=N'在排' THEN 1 ELSE 0 END) AS [在排],
       SUM(CASE WHEN s.[状态]=N'已走货' THEN 1 ELSE 0 END) AS [已走货],
       SUM(CASE WHEN s.[状态]=N'已取消' THEN 1 ELSE 0 END) AS [已取消]
FROM [生产排期批次] b
JOIN [生产排期] s ON s.[批次ID]=b.[ID]
WHERE (@cust IS NULL OR b.[排期客户]=@cust)
  AND (@kw IS NULL OR b.[文件名] LIKE @kw
       OR EXISTS (SELECT 1 FROM [生产排期] x WHERE x.[批次ID]=b.[ID]
                  AND (x.[货号] LIKE @kw OR x.[品名] LIKE @kw OR x.[PO号] LIKE @kw)))
GROUP BY b.[ID],b.[排期客户],b.[文件名],b.[导入日期],b.[操作员]
ORDER BY b.[排期客户],b.[ID] DESC;",
            new { cust, kw });
        return items.AsList();
    }

    // 批次列表（带行数）
    public async Task<IReadOnlyList<ScheduleBatchDto>> BatchesAsync()
    {
        using var c = factory.Create();
        var items = await c.QueryAsync<ScheduleBatchDto>(@"
SELECT b.[ID],b.[排期客户],b.[文件名],b.[导入日期],b.[操作员],b.[新增],b.[更新],b.[备注],
       (SELECT COUNT(*) FROM [生产排期] s WHERE s.[批次ID]=b.[ID]) AS [行数]
FROM [生产排期批次] b
ORDER BY b.[ID] DESC;");
        return items.AsList();
    }

    // 汇总：排期客户 × 状态 的行数/数量（页面顶部统计卡）
    public async Task<IReadOnlyList<ScheduleSummaryDto>> SummaryAsync()
    {
        using var c = factory.Create();
        var items = await c.QueryAsync<ScheduleSummaryDto>(@"
SELECT [排期客户],[状态],COUNT(*) AS [行数],SUM([数量]) AS [数量]
FROM [生产排期]
GROUP BY [排期客户],[状态]
ORDER BY [排期客户],[状态];");
        return items.AsList();
    }

    // 全部排期客户名（下拉过滤用）
    public async Task<IReadOnlyList<string>> CustomersAsync()
    {
        using var c = factory.Create();
        var items = await c.QueryAsync<string>(
            "SELECT DISTINCT [排期客户] FROM [生产排期] ORDER BY [排期客户];");
        return items.AsList();
    }

    // 销售出货审核联动：把指定货号下仍为"在排"的排期行置为"已走货"。
    // 只按货号匹配(货号为各客户产品专属,成品出货明细的物料编号即货号);客户排期 Excel 重导仍是权威源,可回正。
    // 反审核不自动回退状态。
    public async Task<int> MarkShippedBy货号Async(string 货号, string user)
    {
        if (string.IsNullOrWhiteSpace(货号)) return 0;
        using var c = factory.Create();
        return await c.ExecuteAsync(@"
UPDATE [生产排期] SET [状态]=N'已走货', [操作员]=@user
WHERE [状态]=N'在排' AND [货号]=@货号", new { 货号 = 货号.Trim(), user });
    }

    // 导入：同一事务内 建批次 → 逐行按自然键 更新或插入 → 回填批次计数
    public async Task<ScheduleImportResult> ImportAsync(ScheduleImportRequest req, string user)
    {
        var 排期客户 = MasterImportHelper.Clean(req.排期客户)
            ?? throw new ArgumentException("排期客户必填");
        if (req.Rows.Count == 0) throw new ArgumentException("没有可导入的排期行");
        if (req.Rows.Count > MaxImportRows) throw new ArgumentException($"单次最多导入 {MaxImportRows} 行");

        var (valid, failures) = ScheduleImportValidator.Validate(req.Rows);
        var result = new ScheduleImportResult { 失败 = failures.Count, 失败明细 = failures };
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();

        var 批次ID = await c.ExecuteScalarAsync<long>(@"
INSERT INTO [生产排期批次]([排期客户],[文件名],[导入日期],[操作员],[备注])
OUTPUT INSERTED.[ID]
VALUES(@排期客户,@文件名,@导入日期,@操作员,@备注)",
            new
            {
                排期客户,
                文件名 = MasterImportHelper.Clean(req.文件名),
                导入日期 = now,
                操作员 = user,
                备注 = $"导入{req.Rows.Count}行:有效{valid.Count},失败{failures.Count}"
            }, tx);
        result.批次ID = 批次ID;

        // 预载该客户全部既有行的自然键 → 内存判重(整表一次查询,避免逐行 SELECT)
        var existingKeys = new Dictionary<string, long>();
        foreach (var e in await c.QueryAsync<ScheduleKeyRow>(
            "SELECT [ID],[PO号],[客PO],[SKU],[货号],[数量] FROM [生产排期] WHERE [排期客户]=@排期客户",
            new { 排期客户 }, tx))
            existingKeys.TryAdd(KeyOf(e.PO号, e.客PO, e.SKU, e.货号, e.数量), e.ID);

        foreach (var r in valid)
        {
            try
            {
            // 自然键匹配：同一客户同一 PO 行重复导入 → 更新而非重复新增
            if (existingKeys.TryGetValue(KeyOf(r.PO号, r.客PO, r.SKU, r.货号, r.数量), out var existingId))
            {
                await c.ExecuteAsync(@"
UPDATE [生产排期] SET
    [批次ID]=@批次ID,[状态]=@状态,[接单日期]=@接单日期,[客户名称]=@客户名称,[国家]=@国家,
    [品名]=@品名,[内箱]=@内箱,[外箱]=@外箱,[总箱数]=@总箱数,[走货期]=@走货期,[验货期]=@验货期,
    [第三方验货]=@第三方验货,[车间]=@车间,[来源工作表]=@来源工作表,[Excel行号]=@行号,
    [备注]=@备注,[原始数据]=@原始数据,[操作员]=@操作员
WHERE [ID]=@ID",
                    new
                    {
                        批次ID, ID = existingId, r.状态, r.接单日期, r.客户名称, r.国家,
                        r.品名, r.内箱, r.外箱, r.总箱数, r.走货期, r.验货期,
                        r.第三方验货, r.车间, r.来源工作表, r.行号, r.备注, r.原始数据, 操作员 = user
                    }, tx);
                result.更新++;
            }
            else
            {
                var newId = await c.ExecuteScalarAsync<long>(@"
INSERT INTO [生产排期]([批次ID],[排期客户],[状态],[接单日期],[客户名称],[国家],[PO号],[客PO],[SKU],[货号],[品名],
    [数量],[内箱],[外箱],[总箱数],[走货期],[验货期],[第三方验货],[车间],[来源工作表],[Excel行号],[备注],[原始数据],[创建日期],[操作员])
OUTPUT INSERTED.[ID]
VALUES(@批次ID,@排期客户,@状态,@接单日期,@客户名称,@国家,@PO号,@客PO,@SKU,@货号,@品名,
    @数量,@内箱,@外箱,@总箱数,@走货期,@验货期,@第三方验货,@车间,@来源工作表,@行号,@备注,@原始数据,@创建日期,@操作员)",
                    new
                    {
                        批次ID, 排期客户, r.状态, r.接单日期, r.客户名称, r.国家, r.PO号, r.客PO, r.SKU, r.货号, r.品名,
                        r.数量, r.内箱, r.外箱, r.总箱数, r.走货期, r.验货期, r.第三方验货, r.车间, r.来源工作表,
                        r.行号, r.备注, r.原始数据, 创建日期 = now, 操作员 = user
                    }, tx);
                existingKeys[KeyOf(r.PO号, r.客PO, r.SKU, r.货号, r.数量)] = newId;   // 同文件重复行 → 走更新
                result.新增++;
            }
            }
            // 单行 SQL 异常(截断/溢出等)不拖垮整批:记入失败明细继续(与物料导入的失败行语义一致)
            catch (SqlException ex)
            {
                failures.Add(new ImportFailure
                {
                    行号 = r.行号,
                    物料编号 = r.货号 ?? r.PO号,
                    原因 = ex.Message.Split('\n')[0][..Math.Min(120, ex.Message.Split('\n')[0].Length)]
                });
                result.失败 = failures.Count;
                result.失败明细 = failures;
            }
        }

        await c.ExecuteAsync(
            "UPDATE [生产排期批次] SET [新增]=@新增,[更新]=@更新 WHERE [ID]=@批次ID",
            new { result.新增, result.更新, 批次ID }, tx);

        tx.Commit();
        return result;
    }

    // 删除批次：先明细后批次
    public async Task<bool> DeleteBatchAsync(long 批次ID)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var exists = await c.ExecuteScalarAsync<long?>(
            "SELECT [ID] FROM [生产排期批次] WHERE [ID]=@批次ID", new { 批次ID }, tx);
        if (exists is null) return false;
        await c.ExecuteAsync("DELETE FROM [生产排期] WHERE [批次ID]=@批次ID", new { 批次ID }, tx);
        await c.ExecuteAsync("DELETE FROM [生产排期批次] WHERE [ID]=@批次ID", new { 批次ID }, tx);
        tx.Commit();
        return true;
    }

    // 自然键(NULL 归一为空串/-1;数量按定点字符串比较,与 decimal(18,2) 列精度一致)
    internal static string KeyOf(string? po号, string? 客po, string? sku, string? 货号, decimal? 数量)
        => string.Join('\u001f',
            (po号 ?? "").Trim(), (客po ?? "").Trim(), (sku ?? "").Trim(), (货号 ?? "").Trim(),
            数量?.ToString("0.00") ?? "-1");

    // 预载判重的最小行
    private sealed class ScheduleKeyRow
    {
        public long ID { get; set; }
        public string? PO号 { get; set; }
        public string? 客PO { get; set; }
        public string? SKU { get; set; }
        public string? 货号 { get; set; }
        public decimal? 数量 { get; set; }
    }
}
