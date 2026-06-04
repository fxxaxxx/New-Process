using Dapper;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
namespace ErpApi.Engines.Inventory;

// 算法1（物料口径）：物料库存 = 采购入仓(+) + 退料(+) − 领料(−)，仅审核='1'，按 物料编号×仓库 汇总。
// 单据不维护余额——库存是已审核明细单的实时聚合（与成品库存引擎 InventorySummaryService 同哲学）。
public sealed class MaterialInventoryService(ISqlConnectionFactory factory) : IMaterialInventoryService
{
    // 三表符号法子查询（单一真相源；StockOfAsync 与 ListAsync 共用）。审核标志在单头，明细 JOIN 单头。
    private const string LedgerUnion = @"
SELECT d.[物料编号],d.[物料名称],d.[规格],d.[单位],d.[仓库], d.[数量] AS 数量
    FROM [采购入仓明细单] d JOIN [采购入仓单] h ON h.[单号]=d.[单号] WHERE ISNULL(h.[审核],'0')='1'
UNION ALL
SELECT d.[物料编号],d.[物料名称],d.[规格],d.[单位],d.[仓库], d.[数量]
    FROM [退料明细单] d JOIN [退料单] h ON h.[单号]=d.[单号] WHERE ISNULL(h.[审核],'0')='1'
UNION ALL
SELECT d.[物料编号],d.[物料名称],d.[规格],d.[单位],d.[仓库], d.[数量]*-1
    FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号] WHERE ISNULL(h.[审核],'0')='1'";

    public async Task<decimal> StockOfAsync(string 物料编号, (SqlConnection conn, SqlTransaction tx)? scope)
    {
        if (string.IsNullOrEmpty(物料编号)) return 0;
        // 单物料用外层 WHERE 过滤(物料单据量级小,SQL Server 会对 UNION ALL 做等值谓词下推);量级增大后可改为各分支内联 WHERE。
        var sql = $"SELECT ISNULL(SUM([数量]),0) FROM ({LedgerUnion}) t WHERE [物料编号]=@物料编号";
        if (scope is { } s)
            return await s.conn.ExecuteScalarAsync<decimal?>(sql, new { 物料编号 }, s.tx) ?? 0;
        using var c = factory.Create();
        return await c.ExecuteScalarAsync<decimal?>(sql, new { 物料编号 }) ?? 0;
    }

    public async Task<IReadOnlyList<MaterialStockRow>> ListAsync(string? 仓库, string? keyword)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var wh = string.IsNullOrWhiteSpace(仓库) ? null : 仓库.Trim();
        var sql = $@"
SELECT [物料编号], MAX([物料名称]) AS 物料名称, MAX([规格]) AS 规格, MAX([单位]) AS 单位,
       [仓库], SUM([数量]) AS 库存数量
FROM ({LedgerUnion}) t
WHERE (@wh IS NULL OR [仓库]=@wh)
  AND (@kw IS NULL OR [物料编号] LIKE @kw OR [物料名称] LIKE @kw OR [规格] LIKE @kw)
GROUP BY [物料编号],[仓库]
HAVING SUM([数量]) <> 0
ORDER BY [物料编号],[仓库]";
        using var c = factory.Create();
        var rows = await c.QueryAsync<MaterialStockRow>(sql, new { wh, kw });
        return rows.AsList();
    }
}
