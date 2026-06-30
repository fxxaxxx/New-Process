using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Plastics.PlasticRawMaterialPurchaseOrder;

// 原料采购订单(原料仓库·采购计划)。审核 = 纯锁定(走通用过账引擎只翻 审核='1',不动库存)。
public sealed class PlasticRawMaterialPurchaseOrderService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "原料采购订单";
    public const string Prefix = "YCD";   // 原料采购订单号 = YCD + yyyyMMdd + 3位流水

    public async Task<string> CreateAsync(PlasticRawMaterialPurchaseOrderCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("原料采购订单至少要有一行明细");
        var 数量合计 = dto.明细.Sum(l => l.订货数量);
        var 金额合计 = dto.明细.Sum(l => l.订货数量 * (l.单价 ?? 0m));
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [原料采购订单]([单号],[供应商编号],[供应商名称],[订购日期],[交货日期],[数量],[金额],[操作员],[审核],[备注])
VALUES(@单号,@供应商编号,@供应商名称,@订购日期,@交货日期,@数量,@金额,@操作员,'0',@备注)",
            new { 单号, dto.供应商编号, dto.供应商名称, 订购日期 = now, dto.交货日期,
                  数量 = 数量合计, 金额 = 金额合计, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [原料采购订单明细]([单号],[原料编号],[原料名称],[规格],[单位],[单价类型],[订货数量],[单价],[金额],[备注])
VALUES(@单号,@原料编号,@原料名称,@规格,@单位,@单价类型,@订货数量,@单价,@金额,@备注)",
                new { 单号, l.原料编号, l.原料名称, l.规格, l.单位, l.单价类型, l.订货数量, l.单价,
                      金额 = l.订货数量 * (l.单价 ?? 0m), l.备注 }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<PlasticRawMaterialPurchaseOrderHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [原料采购订单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw;
SELECT [ID],[单号],[供应商编号],[供应商名称],[订购日期],[交货日期],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [原料采购订单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [供应商名称] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PlasticRawMaterialPurchaseOrderHeaderDto>()).AsList();
        return new PagedResult<PlasticRawMaterialPurchaseOrderHeaderDto>(items, total);
    }

    public async Task<PlasticRawMaterialPurchaseOrderDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[供应商编号],[供应商名称],[订购日期],[交货日期],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [原料采购订单] WHERE [单号]=@单号;
SELECT [ID],[原料编号],[原料名称],[规格],[单位],[单价类型],[订货数量],[单价],[金额],[备注]
FROM [原料采购订单明细] WHERE [单号]=@单号 ORDER BY [ID];", new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PlasticRawMaterialPurchaseOrderHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PlasticRawMaterialPurchaseOrderLineDto>()).AsList();
        return new PlasticRawMaterialPurchaseOrderDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [原料采购订单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的原料采购订单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [原料采购订单明细] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [原料采购订单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
