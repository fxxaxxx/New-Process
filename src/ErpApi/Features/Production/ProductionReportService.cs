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

    // 领料超数/欠领查询：每(生产单 × 物料) 有 BOM 需求即返回，差异=已领数量(审核领料单) − BOM需求数量(算法4)。
    // 负数=欠领(还没领够/还没领料)，正数=超领。需求按 (生产单号,物料编号) 聚合 Σ总数量；已领按同键 Σ数量(仅审核='1' 领料单)。
    public async Task<List<IssueOverRow>> IssueOverAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<IssueOverRow>(@"
SELECT b.[生产单号], MAX(b.[款号]) AS 款号, MAX(b.[合同号]) AS 合同号, MAX(b.[制单日期]) AS 制单日期,
       b.[物料编号], MAX(b.[物料名称]) AS 物料名称, MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
       SUM(ISNULL(b.[总数量],0)) AS 需求数量, ISNULL(p.已领,0) AS 已领数量,
       ISNULL(p.已领,0) - SUM(ISNULL(b.[总数量],0)) AS 差异
FROM [生产BOM物料清单] b
LEFT JOIN (SELECT d.[生产单号], d.[物料编号], SUM(ISNULL(d.[数量],0)) AS 已领
           FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号]
           WHERE ISNULL(h.[审核],'0')='1' GROUP BY d.[生产单号], d.[物料编号]) p
  ON p.[生产单号]=b.[生产单号] AND p.[物料编号]=b.[物料编号]
WHERE (@kw IS NULL OR b.[生产单号] LIKE @kw OR b.[款号] LIKE @kw OR b.[物料编号] LIKE @kw OR b.[物料名称] LIKE @kw)
GROUP BY b.[生产单号], b.[物料编号], p.已领
ORDER BY b.[生产单号], b.[物料编号]", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // 制单用料查询：指定生产单 每物料 计划用量(生产BOM物料清单 Σ总数量) 对照 实际领料(审核领料单按生产单号+物料 Σ数量)。
    // 差异=实际领料−计划用量（负=欠领，正=超领）。仅 BOM 有需求的物料行（与旧版一致）。
    public async Task<List<OrderMaterialUsageRow>> OrderMaterialUsageAsync(string 生产单号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<OrderMaterialUsageRow>(@"
SELECT b.[物料编号], MAX(b.[物料名称]) AS 物料名称, MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
       SUM(ISNULL(b.[总数量],0)) AS 计划用量, ISNULL(p.已领,0) AS 实际领料,
       ISNULL(p.已领,0) - SUM(ISNULL(b.[总数量],0)) AS 差异,
       MAX(b.[预算单价]) AS 预算单价, SUM(ISNULL(b.[金额],0)) AS 金额
FROM [生产BOM物料清单] b
LEFT JOIN (SELECT d.[物料编号], SUM(ISNULL(d.[数量],0)) AS 已领
           FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号]
           WHERE ISNULL(h.[审核],'0')='1' AND d.[生产单号]=@生产单号
           GROUP BY d.[物料编号]) p
  ON p.[物料编号]=b.[物料编号]
WHERE b.[生产单号]=@生产单号
GROUP BY b.[物料编号], p.已领
ORDER BY b.[物料编号]", new { 生产单号 });
        return rows.AsList();
    }

    // 采购领料分析表：生产BOM物料清单(算法4) 按 (生产单号,物料编号) 归集，
    // 关联 审核采购入仓汇总(采购数量) 与 审核领料汇总(已领数量)；差异=需求数量−已领数量（正=欠领，负=超领）。
    // 日期范围按 制单日期 过滤（止 为含当天，内部转次日开区间）。
    public async Task<List<PurchaseIssueAnalysisRow>> PurchaseIssueAnalysisAsync(DateTime? 起, DateTime? 止, string? keyword)
    {
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<PurchaseIssueAnalysisRow>(@"
SELECT MAX(b.[制单日期]) AS 制单日期, b.[生产单号], MAX(b.[款号]) AS 款号, MAX(b.[合同号]) AS 合同号,
       b.[物料编号], MAX(b.[物料名称]) AS 物料名称, MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
       SUM(ISNULL(b.[总数量],0)) AS 需求数量,
       SUM(ISNULL(b.[库存数量],0)) AS 库存数量, SUM(ISNULL(b.[可用库存],0)) AS 可用库存, SUM(ISNULL(b.[需订数量],0)) AS 需订数量,
       ISNULL(p.已采购,0) AS 采购数量, ISNULL(i.已领,0) AS 已领数量,
       SUM(ISNULL(b.[总数量],0)) - ISNULL(i.已领,0) AS 差异
FROM [生产BOM物料清单] b
LEFT JOIN (SELECT d.[生产单号], d.[物料编号], SUM(ISNULL(d.[数量],0)) AS 已采购
           FROM [采购入仓明细单] d JOIN [采购入仓单] h ON h.[单号]=d.[单号]
           WHERE ISNULL(h.[审核],'0')='1' GROUP BY d.[生产单号], d.[物料编号]) p
  ON p.[生产单号]=b.[生产单号] AND p.[物料编号]=b.[物料编号]
LEFT JOIN (SELECT d.[生产单号], d.[物料编号], SUM(ISNULL(d.[数量],0)) AS 已领
           FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号]
           WHERE ISNULL(h.[审核],'0')='1' GROUP BY d.[生产单号], d.[物料编号]) i
  ON i.[生产单号]=b.[生产单号] AND i.[物料编号]=b.[物料编号]
WHERE (@kw IS NULL OR b.[生产单号] LIKE @kw OR b.[款号] LIKE @kw OR b.[物料编号] LIKE @kw OR b.[物料名称] LIKE @kw)
  AND (@起 IS NULL OR b.[制单日期] >= @起)
  AND (@止 IS NULL OR b.[制单日期] < @止)
GROUP BY b.[生产单号], b.[物料编号], p.已采购, i.已领
ORDER BY b.[生产单号], b.[物料编号]",
            new { kw = Kw(keyword), 起, 止 = 止Excl });
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

    // 物料订单制作工作表：生产BOM物料清单 中 需订数量>0 的待订物料行，按 生产单号/款号/物料编号/物料名称 模糊。
    // 只读；前端勾选行后按 (生产单号,供应商编号) 分组复用采购订单 create 端点生成采购订单。
    public async Task<List<OrderWorksheetRow>> OrderWorksheetAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<OrderWorksheetRow>(@"
SELECT b.[生产单号],b.[款号],b.[物料编号],b.[物料名称],b.[规格],b.[颜色],b.[单位],b.[总数量],b.[库存数量],b.[可用库存],b.[需订数量],b.[预算单价],
       COALESCE(NULLIF(b.[供应商编号],N''), m.[供应商编号]) AS [供应商编号],
       COALESCE(NULLIF(b.[供应商名称],N''), m.[供应商名称]) AS [供应商名称]
FROM [生产BOM物料清单] b
LEFT JOIN [物料资料] m ON m.[物料编号] = b.[物料编号]
WHERE ISNULL(b.[需订数量],0) > 0
  AND (@kw IS NULL OR b.[生产单号] LIKE @kw OR b.[款号] LIKE @kw OR b.[物料编号] LIKE @kw OR b.[物料名称] LIKE @kw)
ORDER BY b.[生产单号],b.[物料编号]", new { kw = Kw(keyword) });
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

    // 成品余料统计表：按款号归集 入仓累计 − 出仓累计 = 余数。仅审核单（明细行 审核='1'，口径同成品库存算法1）。
    // 入仓明细键取 COALESCE(款号,货号)（玩具模型只填货号），客户/名称 取 入仓侧(客户,名称) 缺省回退 出仓侧(客户名称,款式)。
    public async Task<List<FinishedLeftoverRow>> FinishedLeftoverAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<FinishedLeftoverRow>(@"
WITH R AS (
    SELECT COALESCE(NULLIF(d.[款号],N''), d.[货号]) AS 款号,
           MAX(d.[客户]) AS 客户, MAX(COALESCE(NULLIF(d.[名称],N''), d.[款式])) AS 名称,
           SUM(ISNULL(d.[数量],0)) AS 入仓数量
    FROM [成品入仓明细单] d
    WHERE ISNULL(d.[审核],'0')='1'
    GROUP BY COALESCE(NULLIF(d.[款号],N''), d.[货号])
), I AS (
    SELECT d.[款号], MAX(d.[客户名称]) AS 客户, MAX(d.[款式]) AS 名称,
           SUM(ISNULL(d.[数量],0)) AS 出仓数量
    FROM [成品出仓明细单] d
    WHERE ISNULL(d.[审核],'0')='1'
    GROUP BY d.[款号]
)
SELECT COALESCE(r.[款号], i.[款号]) AS 款号,
       COALESCE(NULLIF(r.[客户],N''), i.[客户]) AS 客户,
       COALESCE(NULLIF(r.[名称],N''), i.[名称]) AS 名称,
       ISNULL(r.入仓数量,0) AS 入仓数量, ISNULL(i.出仓数量,0) AS 出仓数量,
       ISNULL(r.入仓数量,0) - ISNULL(i.出仓数量,0) AS 余数
FROM R FULL JOIN I ON i.[款号]=r.[款号]
WHERE (@kw IS NULL OR COALESCE(r.[款号],i.[款号]) LIKE @kw
       OR COALESCE(r.[客户],i.[客户]) LIKE @kw OR COALESCE(r.[名称],i.[名称]) LIKE @kw)
ORDER BY COALESCE(r.[款号], i.[款号])", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // 合同余料统计表：按(合同号 × 物料) 采购入仓累计(审核) − BOM需求(生产BOM物料清单 Σ总数量) = 余料数量。
    // 只统计合同号非空的行；两侧全连接，采购无需求(余料>0)或有需求未采购(余料<0)都会列出。
    public async Task<List<ContractLeftoverRow>> ContractLeftoverAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<ContractLeftoverRow>(@"
WITH B AS (
    SELECT b.[合同号], b.[物料编号],
           MAX(b.[物料名称]) AS 物料名称, MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
           SUM(ISNULL(b.[总数量],0)) AS 需求数量
    FROM [生产BOM物料清单] b
    WHERE NULLIF(LTRIM(RTRIM(b.[合同号])),N'') IS NOT NULL
    GROUP BY b.[合同号], b.[物料编号]
), P AS (
    SELECT d.[合同号], d.[物料编号],
           MAX(d.[物料名称]) AS 物料名称, MAX(d.[规格]) AS 规格, MAX(d.[颜色]) AS 颜色, MAX(d.[单位]) AS 单位,
           SUM(ISNULL(d.[数量],0)) AS 采购数量
    FROM [采购入仓明细单] d JOIN [采购入仓单] h ON h.[单号]=d.[单号]
    WHERE ISNULL(h.[审核],'0')='1' AND NULLIF(LTRIM(RTRIM(d.[合同号])),N'') IS NOT NULL
    GROUP BY d.[合同号], d.[物料编号]
)
SELECT COALESCE(b.[合同号], p.[合同号]) AS 合同号,
       COALESCE(b.[物料编号], p.[物料编号]) AS 物料编号,
       COALESCE(NULLIF(b.[物料名称],N''), p.[物料名称]) AS 物料名称,
       COALESCE(NULLIF(b.[规格],N''), p.[规格]) AS 规格,
       COALESCE(NULLIF(b.[颜色],N''), p.[颜色]) AS 颜色,
       COALESCE(NULLIF(b.[单位],N''), p.[单位]) AS 单位,
       ISNULL(b.需求数量,0) AS 需求数量, ISNULL(p.采购数量,0) AS 采购数量,
       ISNULL(p.采购数量,0) - ISNULL(b.需求数量,0) AS 余料数量
FROM B FULL JOIN P ON p.[合同号]=b.[合同号] AND p.[物料编号]=b.[物料编号]
WHERE (@kw IS NULL OR COALESCE(b.[合同号],p.[合同号]) LIKE @kw
       OR COALESCE(b.[物料编号],p.[物料编号]) LIKE @kw
       OR COALESCE(b.[物料名称],p.[物料名称]) LIKE @kw)
ORDER BY COALESCE(b.[合同号], p.[合同号]), COALESCE(b.[物料编号], p.[物料编号])", new { kw = Kw(keyword) });
        return rows.AsList();
    }

    // 生产加工缺料表：每(生产单 × 物料) 缺料数量 = 需求 − 库存(Σ可用库存) − 已领(审核领料)，仅列缺料>0 的行。
    // 需求/库存取 生产BOM物料清单(算法4) 按(生产单号,物料编号)聚合；已领按同键 Σ数量(仅审核='1' 领料单)。
    public async Task<List<ProcessShortageRow>> ProcessShortageAsync(string? keyword)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<ProcessShortageRow>(@"
SELECT b.[生产单号], MAX(b.[款号]) AS 款号, MAX(b.[合同号]) AS 合同号, MAX(b.[制单日期]) AS 制单日期,
       b.[物料编号], MAX(b.[物料名称]) AS 物料名称, MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
       SUM(ISNULL(b.[总数量],0)) AS 需求数量, SUM(ISNULL(b.[可用库存],0)) AS 库存数量,
       ISNULL(i.已领,0) AS 已领数量,
       SUM(ISNULL(b.[总数量],0)) - SUM(ISNULL(b.[可用库存],0)) - ISNULL(i.已领,0) AS 缺料数量
FROM [生产BOM物料清单] b
LEFT JOIN (SELECT d.[生产单号], d.[物料编号], SUM(ISNULL(d.[数量],0)) AS 已领
           FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号]
           WHERE ISNULL(h.[审核],'0')='1' GROUP BY d.[生产单号], d.[物料编号]) i
  ON i.[生产单号]=b.[生产单号] AND i.[物料编号]=b.[物料编号]
WHERE (@kw IS NULL OR b.[生产单号] LIKE @kw OR b.[款号] LIKE @kw OR b.[物料编号] LIKE @kw OR b.[物料名称] LIKE @kw)
GROUP BY b.[生产单号], b.[物料编号], i.已领
HAVING SUM(ISNULL(b.[总数量],0)) - SUM(ISNULL(b.[可用库存],0)) - ISNULL(i.已领,0) > 0.005
ORDER BY b.[生产单号], b.[物料编号]", new { kw = Kw(keyword) });
        return rows.AsList();
    }
}
