using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Plastics.PlasticPurchaseOrder;

// 塑胶采购订单。头 + 明细。审核 = 纯锁定(走通用过账引擎只翻 审核='1',不动库存)。
// 明细按生产单号从塑胶共用物料表 BOM 调入(同 PlasticMaterialDocService.BasisAsync 口径)。
public sealed class PlasticPurchaseOrderService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "塑胶采购订单";
    public const string Prefix = "SP";   // 塑胶采购订单号 = SP + yyyyMMdd + 3位流水

    public async Task<IReadOnlyList<PlasticPurchaseOrderBasisRow>> BasisAsync(string 生产单号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticPurchaseOrderBasisRow>(@"
SELECT g.[生产单号], pm.[款号], p.[物料编号], p.[物料名称], p.[工模编号] AS 模具编号,
       p.[用量], p.[套数], p.[颜色], p.[色粉号], p.[用料名称]
FROM [塑胶共用物料表] p
JOIN [生产制单货号] g ON g.[货号] = p.[塑胶货号]
LEFT JOIN [生产制单] pm ON pm.[生产单号] = g.[生产单号]
WHERE g.[生产单号] = @生产单号
ORDER BY p.[ID]", new { 生产单号 });
        return rows.AsList();
    }

    public async Task<string> CreateAsync(PlasticPurchaseOrderCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("塑胶采购订单至少要有一行物料明细");
        var 数量合计 = dto.明细.Sum(l => l.数量);
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [塑胶采购订单]([单号],[日期],[交货日期],[供应商编号],[供应商名称],[客户名称],[交货地点],[编号],[数量],[操作员],[审核],[备注])
VALUES(@单号,@日期,@交货日期,@供应商编号,@供应商名称,@客户名称,@交货地点,@编号,@数量,@操作员,'0',@备注)",
            new { 单号, 日期 = now, dto.交货日期, dto.供应商编号, dto.供应商名称, dto.客户名称,
                  dto.交货地点, dto.编号, 数量 = 数量合计, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [塑胶采购订单明细]([单号],[生产单号],[款号],[物料编号],[物料名称],[模具编号],[用量],[套数],[数量],[颜色],[色粉号],[用料名称],[备注])
VALUES(@单号,@生产单号,@款号,@物料编号,@物料名称,@模具编号,@用量,@套数,@数量,@颜色,@色粉号,@用料名称,@备注)",
                new { 单号, l.生产单号, l.款号, l.物料编号, l.物料名称, l.模具编号, l.用量, l.套数,
                      l.数量, l.颜色, l.色粉号, l.用料名称, l.备注 }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<PlasticPurchaseOrderHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [塑胶采购订单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw OR [客户名称] LIKE @kw;
SELECT [ID],[单号],[日期],[交货日期],[供应商名称],[客户名称],[数量],[操作员],[审核],[审核人],[备注]
FROM [塑胶采购订单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw OR [客户名称] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PlasticPurchaseOrderHeaderDto>()).AsList();
        return new PagedResult<PlasticPurchaseOrderHeaderDto>(items, total);
    }

    public async Task<PlasticPurchaseOrderDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[交货日期],[供应商编号],[供应商名称],[客户名称],[交货地点],[编号],[数量],[操作员],[审核],[审核人],[备注]
FROM [塑胶采购订单] WHERE [单号]=@单号;
SELECT [ID],[生产单号],[款号],[物料编号],[物料名称],[模具编号],[用量],[套数],[数量],[颜色],[色粉号],[用料名称],[备注]
FROM [塑胶采购订单明细] WHERE [单号]=@单号 ORDER BY [ID];", new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PlasticPurchaseOrderHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PlasticPurchaseOrderLineDto>()).AsList();
        return new PlasticPurchaseOrderDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [塑胶采购订单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的塑胶采购订单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [塑胶采购订单明细] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [塑胶采购订单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
