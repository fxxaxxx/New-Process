using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Materials.MaterialIssue;

// 领料单（物料库存 − 去向）。两层：领料单 + 领料明细单。库存方向由 MaterialInventoryService 统一处理。
public sealed class MaterialIssueService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "领料单";
    public const string Prefix = "LL";   // 领料单号 = LL + yyyyMMdd + 3位流水

    private static string? Like(string? value) =>
        string.IsNullOrWhiteSpace(value) || value.Trim() == "全部" ? null : $"%{value.Trim()}%";

    private static string? Exact(string? value) =>
        string.IsNullOrWhiteSpace(value) || value.Trim() == "全部" ? null : value.Trim();

    public async Task<string> CreateAsync(MaterialIssueCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("领料单至少要有一行物料明细");
        if (string.IsNullOrWhiteSpace(dto.仓库)) throw new ArgumentException("领料单必须指定仓库");
        var 数量合计 = dto.明细.Sum(l => l.数量);
        var 金额合计 = dto.明细.Sum(l => l.数量 * (l.单价 ?? 0));
        var now = DateTime.Now;
        var docDate = dto.日期 ?? now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();

        var 单号 = await docNo.NextAsync(DocType, Prefix, docDate, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [领料单]([单号],[日期],[领料部门],[领料人],[仓库],[数量],[金额],[操作员],[审核],[备注])
VALUES(@单号,@日期,@领料部门,@领料人,@仓库,@数量,@金额,@操作员,'0',@备注)",
            new { 单号, 日期 = docDate, dto.领料部门, dto.领料人, dto.仓库,
                  数量 = 数量合计, 金额 = 金额合计, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [领料明细单]([单号],[日期],[仓库],[物料类别],[物料编号],[物料名称],[规格],[颜色],[单位],[数量],[单价],[金额],[备注],[生产单号],[款号])
VALUES(@单号,@日期,@仓库,@物料类别,@物料编号,@物料名称,@规格,@颜色,@单位,@数量,@单价,@金额,@备注,@生产单号,@款号)",
                new { 单号, 日期 = docDate, dto.仓库, l.物料类别, l.物料编号, l.物料名称, l.规格, l.颜色, l.单位,
                      l.数量, 单价 = l.单价 ?? 0, 金额 = l.数量 * (l.单价 ?? 0), l.备注, l.生产单号, l.款号 }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<MaterialIssueHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [领料单]
WHERE @kw IS NULL OR [单号] LIKE @kw OR [领料部门] LIKE @kw OR [领料人] LIKE @kw OR [备注] LIKE @kw;
SELECT [ID],[单号],[日期],[领料部门],[领料人],[仓库],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [领料单]
WHERE @kw IS NULL OR [单号] LIKE @kw OR [领料部门] LIKE @kw OR [领料人] LIKE @kw OR [备注] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<MaterialIssueHeaderDto>()).AsList();
        return new PagedResult<MaterialIssueHeaderDto>(items, total);
    }

    public async Task<MaterialIssueDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[领料部门],[领料人],[仓库],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [领料单] WHERE [单号]=@单号;
SELECT [ID],[物料编号],[物料名称],[物料类别],[规格],[颜色],[单位],[数量],[单价],[金额],[备注],[生产单号],[款号]
FROM [领料明细单] WHERE [单号]=@单号 ORDER BY [ID];",
            new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<MaterialIssueHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<MaterialDocLineDto>()).AsList();
        return new MaterialIssueDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [领料单] WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的领料单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [领料明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [领料单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }

    // 审核情况过滤片段："已审核"→已审核；"未审核"→非已审核；其它/空→全部。
    private static string ApprovalFilter(string? 审核情况) => 审核情况 switch
    {
        "已审核" => " AND ISNULL(o.[审核],'0') = '1'",
        "未审核" => " AND ISNULL(o.[审核],'0') <> '1'",
        _ => "",
    };

    // 领料单查询·明细：每行一条领料明细(只读·无价格)。过滤 日期区间/关键词/物料类别/审核情况。
    public async Task<IReadOnlyList<MaterialIssueQueryDetailRow>> IssueQueryDetailAsync(
        DateTime? 起, DateTime? 止, string? keyword, string? 物料类别, string? 审核情况)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<MaterialIssueQueryDetailRow>($@"
SELECT d.[类型], d.[日期], d.[单号], d.[生产单号], d.[款号], d.[领料部门], d.[领料人],
       d.[物料编号], d.[物料名称], d.[物料类别], d.[规格], d.[颜色], d.[单位],
       d.[数量], d.[备注], o.[审核]
FROM [领料明细单] d
JOIN [领料单] o ON o.[单号] = d.[单号]
WHERE (@起 IS NULL OR d.[日期] >= @起)
  AND (@止 IS NULL OR d.[日期] < @止)
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw
       OR d.[领料部门] LIKE @kw OR d.[领料人] LIKE @kw
       OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw OR d.[规格] LIKE @kw)
  AND (@cat IS NULL OR d.[物料类别] = @cat){ApprovalFilter(审核情况)}
ORDER BY d.[日期] DESC, d.[单号], d.[ID];",
            new { 起, 止 = 止Excl, kw, cat });
        return rows.AsList();
    }

    // 领料单查询·汇总：按 物料编号+规格+颜色 合并，SUM(数量)=领用数量。同过滤集。
    public async Task<IReadOnlyList<MaterialIssueSummaryRow>> IssueQuerySummaryAsync(
        DateTime? 起, DateTime? 止, string? keyword, string? 物料类别, string? 审核情况)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<MaterialIssueSummaryRow>($@"
SELECT d.[物料编号], MAX(d.[物料名称]) AS 物料名称, MAX(d.[物料类别]) AS 物料类别,
       d.[规格], d.[颜色], MAX(d.[单位]) AS 单位, SUM(d.[数量]) AS 领用数量
FROM [领料明细单] d
JOIN [领料单] o ON o.[单号] = d.[单号]
WHERE (@起 IS NULL OR d.[日期] >= @起)
  AND (@止 IS NULL OR d.[日期] < @止)
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw
       OR d.[领料部门] LIKE @kw OR d.[领料人] LIKE @kw
       OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw OR d.[规格] LIKE @kw)
  AND (@cat IS NULL OR d.[物料类别] = @cat){ApprovalFilter(审核情况)}
GROUP BY d.[物料编号], d.[规格], d.[颜色]
ORDER BY d.[物料编号], d.[规格], d.[颜色];",
            new { 起, 止 = 止Excl, kw, cat });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<AuxiliaryIssueDetailRow>> AuxiliaryIssueDetailAsync(
        string? 到货情况,
        DateTime? 起,
        DateTime? 止,
        string? keyword,
        string? 日期类型 = null,
        string? 领料备注 = null)
    {
        var dateColumn = 日期类型 switch
        {
            "开单日期" => "q.[开单日期]",
            "领料日期" => "q.[领料日期]",
            _ => null,
        };
        var dateWhere = dateColumn is not null && 起.HasValue && 止.HasValue
            ? $" AND {dateColumn} >= @start AND {dateColumn} < @end"
            : "";
        var status = Exact(到货情况) ?? "未到";

        using var c = factory.Create();
        var rows = await c.QueryAsync<AuxiliaryIssueDetailRow>($@"
WITH 需求 AS (
    SELECT
        h.[日期] AS 开单日期,
        mo.[生产单号] AS 装配生产单号,
        h.[款号] AS 产品货号,
        d.[物料编号] AS 辅料编号,
        MAX(d.[物料名称]) AS 辅料名称,
        MAX(d.[规格]) AS 规格,
        MAX(d.[单位]) AS 单位,
        SUM(COALESCE(mo.[接单数量], h.[使用数量], 0) * ISNULL(d.[使用数量], 0)) AS 需求数量,
        N'生产领料' AS 领料备注
    FROM [款号物料总表] h
    JOIN [款号物料明细表] d ON d.[款号] = h.[款号]
    OUTER APPLY (
        SELECT TOP 1 [生产单号], [接单数量]
        FROM [生产通知单MO单] mo
        WHERE mo.[产品货号] = h.[款号]
        ORDER BY mo.[接单日期] DESC, mo.[ID] DESC
    ) mo
    WHERE d.[物料类别] = N'辅料资料'
    GROUP BY h.[日期], mo.[生产单号], h.[款号], d.[物料编号]
),
领料明细 AS (
    SELECT
        NULLIF(d.[生产单号], N'') AS 装配生产单号,
        NULLIF(d.[款号], N'') AS 产品货号,
        d.[物料编号] AS 辅料编号,
        COALESCE(
            NULLIF(CONVERT(nvarchar(4000), d.[备注]), N''),
            NULLIF(CONVERT(nvarchar(4000), o.[备注]), N''),
            N'生产领料'
        ) AS 领料备注,
        COALESCE(d.[日期], o.[日期]) AS 领料日期,
        d.[单号] AS 领料单号,
        ISNULL(d.[数量], 0) AS 领料数量
    FROM [领料明细单] d
    JOIN [领料单] o ON o.[单号] = d.[单号]
    WHERE ISNULL(o.[审核], N'0') = N'1'
      AND d.[物料类别] = N'辅料资料'
      AND COALESCE(NULLIF(d.[仓库], N''), o.[仓库]) = N'辅料仓库'
),
汇总 AS (
    SELECT
        q.[开单日期],
        q.[装配生产单号],
        COALESCE(NULLIF(l.[领料备注], N''), q.[领料备注]) AS 领料备注,
        q.[辅料编号],
        q.[辅料名称],
        q.[规格],
        q.[单位],
        q.[需求数量],
        l.[领料日期],
        l.[领料单号],
        l.[领料数量],
        ISNULL(t.[合计已领数量], 0) AS 合计已领数量,
        q.[需求数量] - ISNULL(t.[合计已领数量], 0) AS 未领数量
    FROM 需求 q
    OUTER APPLY (
        SELECT SUM(l2.[领料数量]) AS 合计已领数量
        FROM 领料明细 l2
        WHERE l2.[辅料编号] = q.[辅料编号]
          AND (
              (l2.[装配生产单号] IS NOT NULL AND l2.[装配生产单号] = q.[装配生产单号])
              OR (l2.[产品货号] IS NOT NULL AND l2.[产品货号] = q.[产品货号])
          )
    ) t
    LEFT JOIN 领料明细 l ON l.[辅料编号] = q.[辅料编号]
          AND (
              (l.[装配生产单号] IS NOT NULL AND l.[装配生产单号] = q.[装配生产单号])
              OR (l.[产品货号] IS NOT NULL AND l.[产品货号] = q.[产品货号])
          )
)
SELECT
    q.[开单日期],
    q.[装配生产单号],
    q.[领料备注],
    q.[辅料编号],
    q.[辅料名称],
    q.[规格],
    q.[单位],
    q.[需求数量],
    q.[领料日期],
    q.[领料单号],
    q.[领料数量],
    q.[合计已领数量],
    q.[未领数量]
FROM 汇总 q
WHERE (@kw IS NULL
       OR q.[装配生产单号] LIKE @kw
       OR q.[领料备注] LIKE @kw
       OR q.[辅料编号] LIKE @kw
       OR q.[辅料名称] LIKE @kw
       OR q.[规格] LIKE @kw
       OR q.[领料单号] LIKE @kw)
  AND (@remark IS NULL OR q.[领料备注] = @remark)
  {dateWhere}
  AND (@onlyOwed = 0 OR q.[未领数量] > 0)
  AND (@onlyDone = 0 OR q.[未领数量] <= 0)
ORDER BY q.[开单日期] DESC, q.[装配生产单号], q.[辅料编号], q.[领料日期], q.[领料单号];", new
        {
            start = 起?.Date,
            end = 止?.Date.AddDays(1),
            kw = Like(keyword),
            remark = Exact(领料备注),
            onlyOwed = status == "未到" ? 1 : 0,
            onlyDone = status == "已到" ? 1 : 0,
        });
        return rows.AsList();
    }

    private static string AuxiliaryIssueDateWhere(DateTime? 起, DateTime? 止, string? 日期类型)
    {
        if (日期类型 == "不选择日期" || (!起.HasValue && !止.HasValue)) return "";
        return " AND (@start IS NULL OR q.[开单日期] >= @start) AND (@end IS NULL OR q.[开单日期] < @end)";
    }

    public async Task<IReadOnlyList<AuxiliaryStockIssueQuerySummaryRow>> AuxiliaryStockIssueQuerySummaryAsync(
        DateTime? 起,
        DateTime? 止,
        string? keyword,
        string? 物料类别,
        string? 日期类型,
        string? 领料备注)
    {
        var cat = Exact(物料类别);
        var dateWhere = AuxiliaryIssueDateWhere(起, 止, 日期类型);
        using var c = factory.Create();
        var rows = await c.QueryAsync<AuxiliaryStockIssueQuerySummaryRow>($@"
WITH q AS (
    SELECT
        COALESCE(
            NULLIF(CONVERT(nvarchar(4000), d.[备注]), N''),
            NULLIF(CONVERT(nvarchar(4000), o.[备注]), N''),
            N'生产领料'
        ) AS 领料备注,
        COALESCE(o.[日期], d.[日期]) AS 开单日期,
        COALESCE(NULLIF(d.[生产单号], N''), NULLIF(o.[生产单号], N'')) AS 装配生产单号,
        d.[物料编号] AS 辅料编号,
        d.[物料名称] AS 辅料名称,
        d.[规格],
        d.[单位],
        ISNULL(d.[数量], 0) AS 数量,
        d.[备注]
    FROM [领料明细单] d
    JOIN [领料单] o ON o.[单号] = d.[单号]
    WHERE COALESCE(NULLIF(d.[仓库], N''), o.[仓库]) = N'辅料仓库'
      AND d.[物料类别] = N'辅料资料'
      AND (@cat IS NULL OR d.[物料类别] = @cat)
)
SELECT
    q.[领料备注],
    q.[开单日期],
    q.[装配生产单号],
    q.[辅料编号],
    MAX(q.[辅料名称]) AS 辅料名称,
    q.[规格],
    MAX(q.[单位]) AS 单位,
    SUM(q.[数量]) AS 领料数量,
    MAX(q.[备注]) AS 备注
FROM q
WHERE (@kw IS NULL
       OR q.[领料备注] LIKE @kw
       OR q.[装配生产单号] LIKE @kw
       OR q.[辅料编号] LIKE @kw
       OR q.[辅料名称] LIKE @kw
       OR q.[规格] LIKE @kw
       OR q.[备注] LIKE @kw)
  AND (@remark IS NULL OR q.[领料备注] = @remark)
  {dateWhere}
GROUP BY q.[领料备注], q.[开单日期], q.[装配生产单号], q.[辅料编号], q.[规格]
ORDER BY q.[开单日期] DESC, q.[装配生产单号], q.[辅料编号], q.[规格];", new
        {
            start = 起?.Date,
            end = 止?.Date.AddDays(1),
            kw = Like(keyword),
            cat,
            remark = Exact(领料备注),
        });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<AuxiliaryStockIssueQueryDetailRow>> AuxiliaryStockIssueQueryDetailAsync(
        DateTime? 起,
        DateTime? 止,
        string? keyword,
        string? 物料类别,
        string? 日期类型,
        string? 领料备注,
        string? 制单人,
        string? 审核情况)
    {
        var cat = Exact(物料类别);
        var dateWhere = AuxiliaryIssueDateWhere(起, 止, 日期类型);
        using var c = factory.Create();
        var rows = await c.QueryAsync<AuxiliaryStockIssueQueryDetailRow>($@"
WITH q AS (
    SELECT
        COALESCE(
            NULLIF(CONVERT(nvarchar(4000), d.[备注]), N''),
            NULLIF(CONVERT(nvarchar(4000), o.[备注]), N''),
            N'生产领料'
        ) AS 领料备注,
        COALESCE(o.[日期], d.[日期]) AS 开单日期,
        COALESCE(NULLIF(d.[生产单号], N''), NULLIF(o.[生产单号], N'')) AS 装配生产单号,
        d.[日期],
        CAST(NULL AS datetime) AS 审核日期,
        d.[单号],
        COALESCE(NULLIF(d.[领料部门], N''), NULLIF(o.[领料部门], N'')) AS 生产车间,
        COALESCE(NULLIF(d.[领料人], N''), NULLIF(o.[领料人], N'')) AS 领料人,
        d.[物料编号] AS 辅料编号,
        d.[物料名称] AS 辅料名称,
        d.[规格],
        d.[单位],
        ISNULL(d.[数量], 0) AS 数量,
        d.[备注],
        o.[操作员] AS 制单人,
        ISNULL(o.[审核], N'0') AS 审核
    FROM [领料明细单] d
    JOIN [领料单] o ON o.[单号] = d.[单号]
    WHERE COALESCE(NULLIF(d.[仓库], N''), o.[仓库]) = N'辅料仓库'
      AND d.[物料类别] = N'辅料资料'
      AND (@cat IS NULL OR d.[物料类别] = @cat)
)
SELECT
    q.[领料备注],
    q.[开单日期],
    q.[装配生产单号],
    q.[日期],
    q.[审核日期],
    q.[单号],
    q.[生产车间],
    q.[领料人],
    q.[辅料编号],
    q.[辅料名称],
    q.[规格],
    q.[单位],
    q.[数量],
    q.[备注],
    q.[制单人],
    q.[审核]
FROM q
WHERE (@kw IS NULL
       OR q.[领料备注] LIKE @kw
       OR q.[装配生产单号] LIKE @kw
       OR q.[单号] LIKE @kw
       OR q.[生产车间] LIKE @kw
       OR q.[领料人] LIKE @kw
       OR q.[辅料编号] LIKE @kw
       OR q.[辅料名称] LIKE @kw
       OR q.[规格] LIKE @kw
       OR q.[备注] LIKE @kw)
  AND (@remark IS NULL OR q.[领料备注] = @remark)
  AND (@maker IS NULL OR q.[制单人] LIKE @maker)
  AND (@audit IS NULL
       OR (@audit = N'已审核' AND q.[审核] = N'1')
       OR (@audit = N'未审核' AND q.[审核] <> N'1'))
  {dateWhere}
ORDER BY q.[开单日期] DESC, q.[装配生产单号], q.[单号], q.[辅料编号], q.[规格];", new
        {
            start = 起?.Date,
            end = 止?.Date.AddDays(1),
            kw = Like(keyword),
            cat,
            remark = Exact(领料备注),
            maker = Like(制单人),
            audit = Exact(审核情况),
        });
        return rows.AsList();
    }
}
