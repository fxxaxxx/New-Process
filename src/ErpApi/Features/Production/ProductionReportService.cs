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

    // 采购超数查询：每(生产单 × 物料) 已采购数量(审核入仓) − BOM需求数量(算法4) > 0.005 的超采行。
    // 需求按 (生产单号,物料编号) 聚合 Σ总数量；已采购按同键 Σ数量(仅审核='1' 入仓单)。
    public async Task<List<PurchaseOverRow>> PurchaseOverAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PurchaseOverRow>(@"
SELECT b.[生产单号], MAX(b.[款号]) AS 款号, MAX(b.[合同号]) AS 合同号, MAX(b.[制单日期]) AS 制单日期,
       b.[物料编号], MAX(b.[物料名称]) AS 物料名称, MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
       SUM(ISNULL(b.[总数量],0)) AS 需求数量, ISNULL(p.已采购,0) AS 已采购数量,
       ISNULL(p.已采购,0) - SUM(ISNULL(b.[总数量],0)) AS 超数
FROM [生产BOM物料清单] b
LEFT JOIN (SELECT d.[生产单号], d.[物料编号], SUM(ISNULL(d.[数量],0)) AS 已采购
           FROM [采购入仓明细单] d JOIN [采购入仓单] h ON h.[单号]=d.[单号]
           WHERE ISNULL(h.[审核],'0')='1' GROUP BY d.[生产单号], d.[物料编号]) p
  ON p.[生产单号]=b.[生产单号] AND p.[物料编号]=b.[物料编号]
WHERE (@kw IS NULL OR b.[生产单号] LIKE @kw OR b.[款号] LIKE @kw OR b.[物料编号] LIKE @kw OR b.[物料名称] LIKE @kw)
GROUP BY b.[生产单号], b.[物料编号], p.已采购
HAVING ISNULL(p.已采购,0) - SUM(ISNULL(b.[总数量],0)) > 0.005
ORDER BY b.[生产单号], b.[物料编号]", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // 领料超数查询：每(生产单 × 物料) 已领数量(审核领料单) − BOM需求数量(算法4) > 0.005 的超领行。
    // 需求按 (生产单号,物料编号) 聚合 Σ总数量；已领按同键 Σ数量(仅审核='1' 领料单)。
    public async Task<List<IssueOverRow>> IssueOverAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<IssueOverRow>(@"
SELECT b.[生产单号], MAX(b.[款号]) AS 款号, MAX(b.[合同号]) AS 合同号, MAX(b.[制单日期]) AS 制单日期,
       b.[物料编号], MAX(b.[物料名称]) AS 物料名称, MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
       SUM(ISNULL(b.[总数量],0)) AS 需求数量, ISNULL(p.已领,0) AS 已领数量,
       ISNULL(p.已领,0) - SUM(ISNULL(b.[总数量],0)) AS 超数
FROM [生产BOM物料清单] b
LEFT JOIN (SELECT d.[生产单号], d.[物料编号], SUM(ISNULL(d.[数量],0)) AS 已领
           FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号]
           WHERE ISNULL(h.[审核],'0')='1' GROUP BY d.[生产单号], d.[物料编号]) p
  ON p.[生产单号]=b.[生产单号] AND p.[物料编号]=b.[物料编号]
WHERE (@kw IS NULL OR b.[生产单号] LIKE @kw OR b.[款号] LIKE @kw OR b.[物料编号] LIKE @kw OR b.[物料名称] LIKE @kw)
GROUP BY b.[生产单号], b.[物料编号], p.已领
HAVING ISNULL(p.已领,0) - SUM(ISNULL(b.[总数量],0)) > 0.005
ORDER BY b.[生产单号], b.[物料编号]", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // 采购分析明细查询：生产BOM物料清单（算法4 缺料/需求 output）跨全部生产单扁平明细，按 生产单号/款号/物料编号/物料名称 模糊
    public async Task<List<PurchaseAnalysisRow>> PurchaseAnalysisAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PurchaseAnalysisRow>(@"
SELECT [制单日期],[生产单号],[款号],[合同号],[物料编号],[物料名称],[规格],[颜色],[单位],
       [总数量],[库存数量],[可用库存],[需订数量],[预算单价],[金额],[供应商名称]
FROM [生产BOM物料清单]
WHERE (@kw IS NULL OR [生产单号] LIKE @kw OR [款号] LIKE @kw OR [物料编号] LIKE @kw OR [物料名称] LIKE @kw)
ORDER BY [生产单号],[ID]", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // 生产单跟踪表：生产制单 进度（未完成数=计划数量-录入数量）。
    // 审核参数传 '1'/'0' 或 null；完成列存 N'是'/N'否'，参数传 '是'/'否' 或 null（空字符串视为 null=全部）。
    public async Task<List<ProductionTrackingRow>> TrackingAsync(string? keyword, string? 审核, string? 完成)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<ProductionTrackingRow>(@"
SELECT [生产单号],[标识],[款号],[款式],[客户编号],[客户名称],[日期],[下单日期],[交货日期],
       [计划数量],[裁床数量],[录入数量],
       (ISNULL([计划数量],0) - ISNULL([录入数量],0)) AS 未完成数,
       [装箱方式],[订单总箱数],[完成],[审核]
FROM [生产制单]
WHERE (@kw IS NULL OR [生产单号] LIKE @kw OR [款号] LIKE @kw OR [客户名称] LIKE @kw OR [款式] LIKE @kw)
  AND (@审核 IS NULL OR ISNULL([审核],'0')=@审核)
  AND (@完成 IS NULL OR ISNULL([完成],N'否')=@完成)
ORDER BY [日期] DESC, [生产单号] DESC",
            new
            {
                kw = Kw(keyword),
                审核 = string.IsNullOrWhiteSpace(审核) ? null : 审核.Trim(),
                完成 = string.IsNullOrWhiteSpace(完成) ? null : 完成.Trim(),
            });
        return rows.AsList();
    }
}
