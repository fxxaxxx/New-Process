using Dapper;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Production;

// 生产管理只读报表：BOM物料查询 / BOM货号查询 / 货号接单汇总表。
// 全部只读，无事务、无写操作。关键字模糊匹配（%keyword%），空关键字返回全量。
public sealed class ProductionReportService(ISqlConnectionFactory factory)
{
    private static string? Kw(string? keyword) =>
        string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";

    // BOM物料查询：款号物料明细表 平铺，按 款号/物料编号/物料名称 模糊
    public async Task<List<BomMaterialRow>> BomMaterialsAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<BomMaterialRow>(@"
SELECT [款号],[款式],[物料编号],[物料名称],[物料类别],[规格],[颜色],[单位],[使用数量]
FROM [款号物料明细表]
WHERE @kw IS NULL OR [款号] LIKE @kw OR [物料编号] LIKE @kw OR [物料名称] LIKE @kw
ORDER BY [款号],[顺序]", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // BOM货号查询：款号总表 + 该款号物料项数，按 款号/款式 模糊
    public async Task<List<BomStyleRow>> BomStylesAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<BomStyleRow>(@"
SELECT s.[款号],s.[款式],s.[单价],
       (SELECT COUNT(*) FROM [款号物料明细表] m WHERE m.[款号]=s.[款号]) AS 物料项数
FROM [款号总表] s
WHERE @kw IS NULL OR s.[款号] LIKE @kw OR s.[款式] LIKE @kw
ORDER BY s.[款号]", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // 货号接单汇总表：成品客户订单明细表 按货号归集（接单数量=Σ数量，订单数=DISTINCT单号）
    public async Task<List<OrderSummaryRow>> OrderSummaryAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<OrderSummaryRow>(@"
SELECT [款号] AS 货号, MAX([款式]) AS 款式,
       SUM(ISNULL([数量],0)) AS 接单数量, COUNT(DISTINCT [单号]) AS 订单数
FROM [成品客户订单明细表]
WHERE (@kw IS NULL OR [款号] LIKE @kw OR [款式] LIKE @kw)
GROUP BY [款号]
ORDER BY [款号]", new { kw = Kw(keyword) });
        return rows.AsList();
    }
}
