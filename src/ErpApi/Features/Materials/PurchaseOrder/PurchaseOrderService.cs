using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Materials.PurchaseOrder;

// 采购物料单/采购订单。两层：采购订单(单头) + 采购明细单(明细，主从 by 单号)。
// 基准来源：生产BOM物料清单(按生产单号带料)。审核/反审核由过账引擎处理。
public sealed class PurchaseOrderService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "采购订单";
    public const string Prefix = "PO";   // 采购订单号 = PO + yyyyMMdd + 3位流水

    // 从生产单BOM带出采购基准行(物料类别 BOM清单无此列，留空)。
    public async Task<IReadOnlyList<PurchaseOrderBasisRow>> BasisAsync(string 生产单号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PurchaseOrderBasisRow>(@"
SELECT [物料编号],[物料名称],[规格],[颜色],[单位],[总数量],[库存数量],[可用库存],[需订数量],[预算单价],[供应商编号],[供应商名称]
FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 ORDER BY [ID]", new { 生产单号 });
        return rows.AsList();
    }

    // 订单进度：每行一条采购明细，入仓数量按 订单单号+物料编号+颜色 关联已审核入仓，欠数=订购−入仓。
    // 注意：入仓按 订单单号+物料编号+颜色 聚合(无明细行ID)。若同一采购订单出现 物料编号+颜色 完全相同的两行，
    //       聚合入仓会同时挂到两行(高估各自入仓/低估欠数)。当前入仓流程未写 订单单号 故暂不触发；待入仓带订单号时需按行ID细化。
    public async Task<IReadOnlyList<PurchaseOrderProgressRow>> ProgressAsync(
        string? 供应商, DateTime? 起, DateTime? 止, string? keyword, bool onlyOwed)
    {
        var sup = string.IsNullOrWhiteSpace(供应商) ? null : $"%{供应商.Trim()}%";
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var 止Excl = 止?.Date.AddDays(1);   // 半开区间上界
        using var c = factory.Create();
        var rows = await c.QueryAsync<PurchaseOrderProgressRow>(@"
SELECT d.[日期] AS 订购日期, d.[交货日期], d.[单号] AS 采购单号, d.[生产单号], d.[款号],
       d.[物料编号], d.[物料名称], d.[物料类别], d.[规格], d.[颜色], d.[单位],
       d.[数量] AS 订购数量,
       ISNULL(rk.[入仓数量], 0) AS 入仓数量,
       d.[数量] - ISNULL(rk.[入仓数量], 0) AS 欠数,
       o.[供应商名称], o.[操作员], o.[审核]
FROM [采购明细单] d
JOIN [采购订单] o ON o.[单号] = d.[单号]
LEFT JOIN (
    SELECT r.[订单单号], r.[物料编号], ISNULL(r.[颜色],'') AS 颜色键, SUM(r.[数量]) AS 入仓数量
    FROM [采购入仓明细单] r
    JOIN [采购入仓单] h ON h.[单号] = r.[单号]
    WHERE ISNULL(h.[审核],'0') = '1'
    GROUP BY r.[订单单号], r.[物料编号], ISNULL(r.[颜色],'')
) rk ON rk.[订单单号] = d.[单号] AND rk.[物料编号] = d.[物料编号] AND rk.[颜色键] = ISNULL(d.[颜色],'')
WHERE (@sup IS NULL OR o.[供应商编号] LIKE @sup OR o.[供应商名称] LIKE @sup)
  AND (@起 IS NULL OR d.[日期] >= @起)
  AND (@止 IS NULL OR d.[日期] < @止)
  AND (@kw IS NULL OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw)
  AND (@onlyOwed = 0 OR (d.[数量] - ISNULL(rk.[入仓数量], 0)) > 0)
ORDER BY d.[单号] DESC, d.[ID];",
            new { sup, 起, 止 = 止Excl, kw, onlyOwed = onlyOwed ? 1 : 0 });
        return rows.AsList();
    }

    // 进度明细：订单明细 LEFT JOIN 已审核入仓明细(不聚合)，每条入仓一行，零入仓订单行留空。
    // 状态: "已入仓"=入仓单号非空 / "未入仓"=入仓单号空 / 其它=全部。入仓日期取入仓单表头。
    // 排序 单号→明细ID→入仓日期：同一明细行(ID)要么全是已入仓行、要么唯一一条未入仓空行，
    // 二者不会混在同一 ID 内，故入仓日期的 NULLS FIRST 不会把未入仓行错排到别的明细组中间。
    public async Task<IReadOnlyList<PurchaseOrderProgressDetailRow>> ProgressDetailAsync(
        string? 供应商, DateTime? 起, DateTime? 止, string? keyword, string? 状态)
    {
        var sup = string.IsNullOrWhiteSpace(供应商) ? null : $"%{供应商.Trim()}%";
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var 止Excl = 止?.Date.AddDays(1);   // 半开区间上界
        var onlyIn = 状态 == "已入仓" ? 1 : 0;
        var onlyOut = 状态 == "未入仓" ? 1 : 0;
        using var c = factory.Create();
        var rows = await c.QueryAsync<PurchaseOrderProgressDetailRow>(@"
SELECT d.[日期] AS 订购日期, d.[交货日期], d.[单号] AS 采购单号, d.[生产单号], d.[款号],
       d.[物料编号], d.[物料名称], d.[物料类别], d.[规格], d.[颜色], d.[单位],
       d.[数量] AS 订购数量,
       rk.[入仓单号], rk.[入仓数量], rk.[入仓日期],
       o.[供应商名称], o.[操作员], o.[审核]
FROM [采购明细单] d
JOIN [采购订单] o ON o.[单号] = d.[单号]
LEFT JOIN (
    SELECT r.[订单单号], r.[物料编号], ISNULL(r.[颜色],'') AS 颜色键,
           r.[单号] AS 入仓单号, r.[数量] AS 入仓数量, h.[日期] AS 入仓日期
    FROM [采购入仓明细单] r
    JOIN [采购入仓单] h ON h.[单号] = r.[单号]
    WHERE ISNULL(h.[审核],'0') = '1'
) rk ON rk.[订单单号] = d.[单号] AND rk.[物料编号] = d.[物料编号] AND rk.[颜色键] = ISNULL(d.[颜色],'')
WHERE (@sup IS NULL OR o.[供应商编号] LIKE @sup OR o.[供应商名称] LIKE @sup)
  AND (@起 IS NULL OR d.[日期] >= @起)
  AND (@止 IS NULL OR d.[日期] < @止)
  AND (@kw IS NULL OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw)
  AND (@onlyIn = 0 OR rk.[入仓单号] IS NOT NULL)
  AND (@onlyOut = 0 OR rk.[入仓单号] IS NULL)
ORDER BY d.[单号] DESC, d.[ID], rk.[入仓日期];",
            new { sup, 起, 止 = 止Excl, kw, onlyIn, onlyOut });
        return rows.AsList();
    }

    public async Task<string> CreateAsync(PurchaseOrderCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("采购订单至少要有一行物料明细");
        if (string.IsNullOrWhiteSpace(dto.供应商编号)) throw new ArgumentException("采购订单必须指定供应商");

        var 数量合计 = dto.明细.Sum(l => l.数量);
        var 金额合计 = dto.明细.Sum(l => l.数量 * (l.单价 ?? 0));
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();

        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [采购订单]([单号],[日期],[交货日期],[供应商编号],[供应商名称],[仓库],[数量],[金额],[操作员],[审核],[备注],[生产单号])
VALUES(@单号,@日期,@交货日期,@供应商编号,@供应商名称,@仓库,@数量,@金额,@操作员,'0',@备注,@生产单号)",
            new { 单号, 日期 = now, dto.交货日期, dto.供应商编号, dto.供应商名称, dto.仓库,
                  数量 = 数量合计, 金额 = 金额合计, 操作员 = user, dto.备注, dto.生产单号 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [采购明细单]([单号],[生产单号],[日期],[交货日期],[供应商编号],[供应商名称],[仓库],[物料类别],[物料编号],[物料名称],[规格],[颜色],[单位],[数量],[单价],[金额],[预算数量])
VALUES(@单号,@生产单号,@日期,@交货日期,@供应商编号,@供应商名称,@仓库,@物料类别,@物料编号,@物料名称,@规格,@颜色,@单位,@数量,@单价,@金额,@预算数量)",
                new { 单号, dto.生产单号, 日期 = now, dto.交货日期, dto.供应商编号, dto.供应商名称, dto.仓库,
                      l.物料类别, l.物料编号, l.物料名称, l.规格, l.颜色, l.单位,
                      l.数量, 单价 = l.单价 ?? 0, 金额 = l.数量 * (l.单价 ?? 0), l.预算数量 }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<PurchaseOrderHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [采购订单]
WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw OR [生产单号] LIKE @kw;
SELECT [ID],[单号],[日期],[交货日期],[供应商编号],[供应商名称],[仓库],[数量],[金额],[操作员],[审核],[审核人],[备注],[生产单号]
FROM [采购订单]
WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw OR [生产单号] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PurchaseOrderHeaderDto>()).AsList();
        return new PagedResult<PurchaseOrderHeaderDto>(items, total);
    }

    public async Task<PurchaseOrderDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[交货日期],[供应商编号],[供应商名称],[仓库],[数量],[金额],[操作员],[审核],[审核人],[备注],[生产单号]
FROM [采购订单] WHERE [单号]=@单号;
SELECT [ID],[物料编号],[物料名称],[物料类别],[规格],[颜色],[单位],[数量],[单价],[金额],[预算数量]
FROM [采购明细单] WHERE [单号]=@单号 ORDER BY [ID];",
            new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PurchaseOrderHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PurchaseOrderLineRowDto>()).AsList();
        return new PurchaseOrderDetailDto { 单头 = header, 明细 = lines };
    }

    // 删除：仅未审核可删；FK 顺序 明细→单头
    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [采购订单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的采购订单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [采购明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [采购订单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
