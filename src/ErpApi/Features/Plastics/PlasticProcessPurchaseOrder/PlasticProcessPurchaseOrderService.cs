using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Plastics.PlasticProcessPurchaseOrder;

// 塑胶加工采购单(发外加工)。头(加工厂) + 明细(加工内容/单价/金额·带价)。
// 审核 = 纯锁定(走通用过账引擎只翻 审核='1',不动库存)。
// 明细按生产单号从塑胶共用物料表 BOM 调入(带出 加工内容/加工单价)。
public sealed class PlasticProcessPurchaseOrderService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "塑胶加工采购单";
    public const string Prefix = "SJ";   // 塑胶加工采购单号 = SJ + yyyyMMdd + 3位流水

    public async Task<IReadOnlyList<PlasticProcessPurchaseOrderBasisRow>> BasisAsync(string 生产单号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticProcessPurchaseOrderBasisRow>(@"
SELECT g.[生产单号], pm.[款号], p.[工模编号] AS 模具编号, p.[物料编号], p.[物料名称],
       p.[用料名称], p.[颜色], p.[加工内容], p.[加工单价] AS 单价
FROM [塑胶共用物料表] p
JOIN [生产制单货号] g ON g.[货号] = p.[塑胶货号]
LEFT JOIN [生产制单] pm ON pm.[生产单号] = g.[生产单号]
WHERE g.[生产单号] = @生产单号
ORDER BY p.[ID]", new { 生产单号 });
        return rows.AsList();
    }

    public async Task<string> CreateAsync(PlasticProcessPurchaseOrderCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("塑胶加工采购单至少要有一行加工明细");
        var 数量合计 = dto.明细.Sum(l => l.数量);
        var 金额合计 = dto.明细.Sum(l => l.数量 * (l.单价 ?? 0m));
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [塑胶加工采购单]([单号],[日期],[交货日期],[加工厂编号],[加工厂名称],[客户名称],[收货仓库],[收货人],[数量],[金额],[操作员],[审核],[备注])
VALUES(@单号,@日期,@交货日期,@加工厂编号,@加工厂名称,@客户名称,@收货仓库,@收货人,@数量,@金额,@操作员,'0',@备注)",
            new { 单号, 日期 = now, dto.交货日期, dto.加工厂编号, dto.加工厂名称, dto.客户名称,
                  dto.收货仓库, dto.收货人, 数量 = 数量合计, 金额 = 金额合计, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [塑胶加工采购单明细]([单号],[生产单号],[款号],[模具编号],[物料编号],[物料名称],[用料名称],[颜色],[加工内容],[数量],[单价],[金额],[备注])
VALUES(@单号,@生产单号,@款号,@模具编号,@物料编号,@物料名称,@用料名称,@颜色,@加工内容,@数量,@单价,@金额,@备注)",
                new { 单号, l.生产单号, l.款号, l.模具编号, l.物料编号, l.物料名称, l.用料名称, l.颜色,
                      l.加工内容, l.数量, l.单价, 金额 = l.数量 * (l.单价 ?? 0m), l.备注 }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<PlasticProcessPurchaseOrderHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [塑胶加工采购单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [加工厂名称] LIKE @kw OR [客户名称] LIKE @kw;
SELECT [ID],[单号],[日期],[交货日期],[加工厂名称],[客户名称],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [塑胶加工采购单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [加工厂名称] LIKE @kw OR [客户名称] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PlasticProcessPurchaseOrderHeaderDto>()).AsList();
        return new PagedResult<PlasticProcessPurchaseOrderHeaderDto>(items, total);
    }

    public async Task<PlasticProcessPurchaseOrderDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[交货日期],[加工厂编号],[加工厂名称],[客户名称],[收货仓库],[收货人],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [塑胶加工采购单] WHERE [单号]=@单号;
SELECT [ID],[生产单号],[款号],[模具编号],[物料编号],[物料名称],[用料名称],[颜色],[加工内容],[数量],[单价],[金额],[备注]
FROM [塑胶加工采购单明细] WHERE [单号]=@单号 ORDER BY [ID];", new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PlasticProcessPurchaseOrderHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PlasticProcessPurchaseOrderLineDto>()).AsList();
        return new PlasticProcessPurchaseOrderDetailDto { 单头 = header, 明细 = lines };
    }

    private static string ApprovalFilter(string? 审核情况) => 审核情况 switch
    {
        "已审核" => " AND ISNULL(h.[审核],'0')='1'",
        "未审核" => " AND ISNULL(h.[审核],'0')<>'1'",
        _ => "",
    };

    public async Task<IReadOnlyList<PlasticProcessPurchaseQueryDetailRow>> QueryDetailAsync(
        DateTime 起, DateTime 止, string? keyword, string? 审核情况, string? 物料类别)
    {
        var qi = 起.Date; var qe = 止.Date.AddDays(1);
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticProcessPurchaseQueryDetailRow>($@"
SELECT h.[日期] AS 单据日期, d.[单号], h.[加工厂名称], d.[生产单号], d.[款号], d.[模具编号], d.[物料编号], d.[物料名称],
       d.[用料名称], d.[颜色], d.[加工内容], m.[单位], d.[数量], d.[单价], d.[金额], d.[备注], h.[审核]
FROM [塑胶加工采购单明细] d
JOIN [塑胶加工采购单] h ON h.[单号] = d.[单号]
LEFT JOIN (SELECT [物料编号], MAX([单位]) AS 单位, MAX([物料类别]) AS 物料类别 FROM [塑胶物料资料] GROUP BY [物料编号]) m ON m.[物料编号] = d.[物料编号]
WHERE h.[日期] >= @qi AND h.[日期] < @qe
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR h.[加工厂名称] LIKE @kw OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw)
  AND (@cat IS NULL OR m.[物料类别] = @cat){ApprovalFilter(审核情况)}
ORDER BY h.[日期] DESC, d.[单号], d.[ID]", new { qi, qe, kw, cat });
        return rows.AsList();
    }

    public async Task<IReadOnlyList<PlasticProcessPurchaseQuerySummaryRow>> QuerySummaryAsync(
        DateTime 起, DateTime 止, string? keyword, string? 审核情况, string? 物料类别)
    {
        var qi = 起.Date; var qe = 止.Date.AddDays(1);
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticProcessPurchaseQuerySummaryRow>($@"
SELECT d.[模具编号], d.[物料编号], MAX(d.[物料名称]) AS 物料名称, d.[颜色],
       MAX(cm.[共用原料编号]) AS 共用物料, d.[加工内容], MAX(m.[物料类别]) AS 物料类别, MAX(m.[单位]) AS 单位,
       SUM(d.[数量]) AS 订购数量, SUM(ISNULL(d.[金额],0)) AS 总金额
FROM [塑胶加工采购单明细] d
JOIN [塑胶加工采购单] h ON h.[单号] = d.[单号]
LEFT JOIN (SELECT [物料编号], MAX([共用原料编号]) AS 共用原料编号 FROM [塑胶共用物料表] GROUP BY [物料编号]) cm ON cm.[物料编号] = d.[物料编号]
LEFT JOIN (SELECT [物料编号], MAX([单位]) AS 单位, MAX([物料类别]) AS 物料类别 FROM [塑胶物料资料] GROUP BY [物料编号]) m ON m.[物料编号] = d.[物料编号]
WHERE h.[日期] >= @qi AND h.[日期] < @qe
  AND (@kw IS NULL OR d.[单号] LIKE @kw OR h.[加工厂名称] LIKE @kw OR d.[生产单号] LIKE @kw OR d.[款号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw)
  AND (@cat IS NULL OR m.[物料类别] = @cat){ApprovalFilter(审核情况)}
GROUP BY d.[模具编号], d.[物料编号], d.[颜色], d.[加工内容]
ORDER BY d.[物料编号]", new { qi, qe, kw, cat });
        return rows.AsList();
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [塑胶加工采购单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的塑胶加工采购单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [塑胶加工采购单明细] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [塑胶加工采购单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
