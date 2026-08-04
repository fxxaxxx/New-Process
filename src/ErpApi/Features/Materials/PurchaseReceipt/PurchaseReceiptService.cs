using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Materials.PurchaseReceipt;

// 采购入仓单（物料库存 + 来源）。两层：采购入仓单 + 采购入仓明细单（明细主从 FK→单头）。
// 单据不写库存余额——审核后由 MaterialInventoryService 实时聚合。
public sealed class PurchaseReceiptService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "采购入仓单";
    public const string Prefix = "CG";   // 采购入仓单号 = CG + yyyyMMdd + 3位流水

    public async Task<string> CreateAsync(PurchaseReceiptCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("采购入仓单至少要有一行物料明细");
        if (string.IsNullOrWhiteSpace(dto.仓库)) throw new ArgumentException("采购入仓单必须指定仓库");

        var 数量合计 = dto.明细.Sum(l => l.数量);
        var 金额合计 = dto.明细.Sum(l => l.数量 * (l.单价 ?? 0));
        var now = DateTime.Now;
        var docDate = dto.日期 ?? now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();

        var 单号 = await docNo.NextAsync(DocType, Prefix, docDate, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [采购入仓单]([单号],[日期],[供应商编号],[供应商名称],[仓库],[付款方式],[数量],[金额],[操作员],[审核],[备注])
VALUES(@单号,@日期,@供应商编号,@供应商名称,@仓库,@付款方式,@数量,@金额,@操作员,'0',@备注)",
            new { 单号, 日期 = docDate, dto.供应商编号, dto.供应商名称, dto.仓库, dto.付款方式,
                  数量 = 数量合计, 金额 = 金额合计, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [采购入仓明细单]([单号],[订单单号],[生产单号],[款号],[日期],[仓库],[物料类别],[物料编号],[物料名称],[规格],[颜色],[单位],[数量],[单价],[金额],[备注])
VALUES(@单号,@订单单号,@生产单号,@款号,@日期,@仓库,@物料类别,@物料编号,@物料名称,@规格,@颜色,@单位,@数量,@单价,@金额,@备注)",
                new { 单号, l.订单单号, l.生产单号, l.款号, 日期 = docDate, dto.仓库, l.物料类别, l.物料编号, l.物料名称, l.规格, l.颜色, l.单位,
                      l.数量, 单价 = l.单价 ?? 0, 金额 = l.数量 * (l.单价 ?? 0), l.备注 }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<PurchaseReceiptHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 1000) size = 1000;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [采购入仓单]
WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商编号] LIKE @kw OR [供应商名称] LIKE @kw OR [备注] LIKE @kw;
SELECT [ID],[单号],[日期],[供应商编号],[供应商名称],[仓库],[付款方式],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [采购入仓单]
WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商编号] LIKE @kw OR [供应商名称] LIKE @kw OR [备注] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PurchaseReceiptHeaderDto>()).AsList();
        return new PagedResult<PurchaseReceiptHeaderDto>(items, total);
    }

    public async Task<PurchaseReceiptDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[供应商编号],[供应商名称],[仓库],[付款方式],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [采购入仓单] WHERE [单号]=@单号;
SELECT [ID],[订单单号],[生产单号],[款号],[物料编号],[物料名称],[物料类别],[规格],[颜色],[单位],[数量],[单价],[金额],[备注]
FROM [采购入仓明细单] WHERE [单号]=@单号 ORDER BY [ID];",
            new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PurchaseReceiptHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<MaterialDocLineDto>()).AsList();
        return new PurchaseReceiptDetailDto { 单头 = header, 明细 = lines };
    }

    // 删除：仅未审核可删；FK 顺序 明细→单头
    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [采购入仓单] WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的采购入仓单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [采购入仓明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [采购入仓单] WHERE [单号]=@单号", new { 单号 }, tx);
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

    private static string ReceiptDateCol(string? 日期类型) => 日期类型 switch
    {
        "日期" => "日期",
        _ => "日期",
    };

    // 来料标签查询·明细：每行一条采购入仓明细(只读)。过滤 日期区间/物料关键词/物料类别/审核情况。
    public async Task<IReadOnlyList<MaterialLabelDetailRow>> LabelQueryDetailAsync(
        DateTime? 起, DateTime? 止, string? keyword, string? 物料类别, string? 审核情况)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<MaterialLabelDetailRow>($@"
SELECT d.[日期], d.[单号], d.[款号],
       d.[物料编号], d.[物料名称], d.[物料类别], d.[规格], d.[颜色], d.[单位],
       d.[数量], d.[备注], o.[审核]
FROM [采购入仓明细单] d
JOIN [采购入仓单] o ON o.[单号] = d.[单号]
WHERE (@起 IS NULL OR d.[日期] >= @起)
  AND (@止 IS NULL OR d.[日期] < @止)
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw OR d.[规格] LIKE @kw)
  AND (@cat IS NULL OR d.[物料类别] = @cat){ApprovalFilter(审核情况)}
ORDER BY d.[日期] DESC, d.[单号], d.[ID];",
            new { 起, 止 = 止Excl, kw, cat });
        return rows.AsList();
    }

    // 采购入仓查询·明细：每行一条采购入仓明细(全列·无价格)。过滤 日期区间/关键词/物料类别/审核情况。
    // 入库单号=d.单号(双击键)，单号=d.条码号(来料/条码号)。
    public async Task<IReadOnlyList<PurchaseReceiptQueryDetailRow>> ReceiptQueryDetailAsync(
        DateTime? 起, DateTime? 止, string? keyword, string? 物料类别, string? 审核情况)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<PurchaseReceiptQueryDetailRow>($@"
SELECT d.[日期], d.[条码号] AS 单号, d.[单号] AS 入库单号, d.[订单单号],
       COALESCE(NULLIF(d.[供应商编号],N''), o.[供应商编号]) AS 供应商编号,
       COALESCE(NULLIF(d.[供应商名称],N''), o.[供应商名称]) AS 供应商名称,
       d.[生产单号], d.[款号], d.[物料编号], d.[物料名称], d.[物料类别], d.[规格], d.[颜色], d.[单位],
       d.[数量], d.[备注], o.[审核]
FROM [采购入仓明细单] d
JOIN [采购入仓单] o ON o.[单号] = d.[单号]
WHERE (@起 IS NULL OR d.[日期] >= @起)
  AND (@止 IS NULL OR d.[日期] < @止)
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR d.[条码号] LIKE @kw OR d.[订单单号] LIKE @kw
       OR d.[供应商名称] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw OR d.[规格] LIKE @kw)
  AND (@cat IS NULL OR d.[物料类别] = @cat){ApprovalFilter(审核情况)}
ORDER BY d.[日期] DESC, d.[单号], d.[ID];",
            new { 起, 止 = 止Excl, kw, cat });
        return rows.AsList();
    }

    // 来料标签查询/采购入仓查询·汇总：按 物料编号+规格+颜色 合并，SUM(数量)。同过滤集(两页共用)。
    public async Task<IReadOnlyList<MaterialLabelSummaryRow>> LabelQuerySummaryAsync(
        DateTime? 起, DateTime? 止, string? keyword, string? 物料类别, string? 审核情况)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<MaterialLabelSummaryRow>($@"
SELECT d.[物料编号], MAX(d.[物料名称]) AS 物料名称, MAX(d.[物料类别]) AS 物料类别,
       d.[规格], d.[颜色], MAX(d.[单位]) AS 单位, SUM(d.[数量]) AS 数量
FROM [采购入仓明细单] d
JOIN [采购入仓单] o ON o.[单号] = d.[单号]
WHERE (@起 IS NULL OR d.[日期] >= @起)
  AND (@止 IS NULL OR d.[日期] < @止)
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw OR d.[规格] LIKE @kw)
  AND (@cat IS NULL OR d.[物料类别] = @cat){ApprovalFilter(审核情况)}
GROUP BY d.[物料编号], d.[规格], d.[颜色]
ORDER BY d.[物料编号], d.[规格], d.[颜色];",
            new { 起, 止 = 止Excl, kw, cat });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<AuxiliaryReceiptQuerySummaryRow>> AuxiliaryReceiptQuerySummaryAsync(
        DateTime? 起, DateTime? 止, string? keyword, string? 物料类别, string? 日期类型, bool 按供应商)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) || 物料类别 == "所有类别" || 物料类别 == "<所有类别>"
            ? null
            : 物料类别.Trim();
        var 止Excl = 止?.Date.AddDays(1);
        var dc = ReceiptDateCol(日期类型);
        var supplierSelect = 按供应商
            ? "COALESCE(NULLIF(d.[供应商编号],N''), o.[供应商编号]) AS 供应商编号, COALESCE(NULLIF(d.[供应商名称],N''), o.[供应商名称]) AS 供应商名称,"
            : "CAST(NULL AS nvarchar(40)) AS 供应商编号, CAST(NULL AS nvarchar(120)) AS 供应商名称,";
        var supplierGroup = 按供应商
            ? "COALESCE(NULLIF(d.[供应商编号],N''), o.[供应商编号]), COALESCE(NULLIF(d.[供应商名称],N''), o.[供应商名称]),"
            : "";
        var supplierOrder = 按供应商 ? "供应商编号, " : "";

        using var c = factory.Create();
        var rows = await c.QueryAsync<AuxiliaryReceiptQuerySummaryRow>($@"
SELECT {supplierSelect}
       d.[物料编号] AS 辅料编号,
       MAX(d.[物料名称]) AS 辅料名称,
       d.[规格],
       MAX(d.[单位]) AS 单位,
       SUM(ISNULL(d.[数量],0)) AS 入仓数量
FROM [采购入仓明细单] d
JOIN [采购入仓单] o ON o.[单号] = d.[单号]
WHERE COALESCE(NULLIF(d.[仓库],N''), o.[仓库]) = N'辅料仓库'
  AND d.[物料类别] = N'辅料资料'
  AND (@起 IS NULL OR d.[{dc}] >= @起)
  AND (@止 IS NULL OR d.[{dc}] < @止)
  AND (@cat IS NULL OR d.[物料类别] = @cat)
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR d.[条码号] LIKE @kw OR d.[订单单号] LIKE @kw
       OR o.[供应商编号] LIKE @kw OR o.[供应商名称] LIKE @kw
       OR d.[供应商编号] LIKE @kw OR d.[供应商名称] LIKE @kw
       OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw OR d.[规格] LIKE @kw)
GROUP BY {supplierGroup} d.[物料编号], d.[规格]
ORDER BY {supplierOrder} d.[物料编号], d.[规格];",
            new { 起, 止 = 止Excl, kw, cat });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<AuxiliaryReceiptQueryDetailRow>> AuxiliaryReceiptQueryDetailAsync(
        DateTime? 起, DateTime? 止, string? keyword, string? 物料类别, string? 日期类型, string? 审核情况)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) || 物料类别 == "所有类别" || 物料类别 == "<所有类别>"
            ? null
            : 物料类别.Trim();
        var 止Excl = 止?.Date.AddDays(1);
        var dc = ReceiptDateCol(日期类型);
        var onlyApproved = 审核情况 == "已审核" ? 1 : 0;
        var onlyUnapproved = 审核情况 == "未审核" ? 1 : 0;

        using var c = factory.Create();
        var rows = await c.QueryAsync<AuxiliaryReceiptQueryDetailRow>($@"
SELECT COALESCE(d.[日期], o.[日期]) AS 日期,
       d.[条码号] AS 单号,
       d.[单号] AS 入库单号,
       d.[订单单号],
       COALESCE(NULLIF(d.[供应商编号],N''), o.[供应商编号]) AS 供应商编号,
       COALESCE(NULLIF(d.[供应商名称],N''), o.[供应商名称]) AS 供应商名称,
       d.[物料编号] AS 辅料编号,
       d.[物料名称] AS 辅料名称,
       d.[规格],
       COALESCE(NULLIF(d.[付款方式],N''), o.[付款方式]) AS 单价类型,
       d.[单位],
       ISNULL(d.[数量],0) AS 数量,
       d.[备注],
       ISNULL(o.[审核],N'0') AS 审核
FROM [采购入仓明细单] d
JOIN [采购入仓单] o ON o.[单号] = d.[单号]
WHERE COALESCE(NULLIF(d.[仓库],N''), o.[仓库]) = N'辅料仓库'
  AND d.[物料类别] = N'辅料资料'
  AND (@起 IS NULL OR d.[{dc}] >= @起)
  AND (@止 IS NULL OR d.[{dc}] < @止)
  AND (@cat IS NULL OR d.[物料类别] = @cat)
  AND (@onlyApproved = 0 OR ISNULL(o.[审核],N'0') = N'1')
  AND (@onlyUnapproved = 0 OR ISNULL(o.[审核],N'0') <> N'1')
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR d.[条码号] LIKE @kw OR d.[订单单号] LIKE @kw
       OR o.[供应商编号] LIKE @kw OR o.[供应商名称] LIKE @kw
       OR d.[供应商编号] LIKE @kw OR d.[供应商名称] LIKE @kw
       OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw OR d.[规格] LIKE @kw)
ORDER BY COALESCE(d.[日期], o.[日期]) DESC, d.[单号], d.[ID];",
            new { 起, 止 = 止Excl, kw, cat, onlyApproved, onlyUnapproved });
        return rows.AsList();
    }
}
