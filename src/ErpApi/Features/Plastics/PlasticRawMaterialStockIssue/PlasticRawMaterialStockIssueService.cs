using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Plastics.PlasticRawMaterialStockIssue;

// 原料出库单(原料仓库·生产领料出库)。无价。v1 审核 = 纯锁定(走通用过账引擎只翻 审核='1',不动库存;库存台账延后)。
public sealed class PlasticRawMaterialStockIssueService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "原料出库单";
    public const string Prefix = "YCK";   // 原料出库单号 = YCK + yyyyMMdd + 3位流水

    public async Task<string> CreateAsync(PlasticRawMaterialStockIssueCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("原料出库单至少要有一行明细");
        var 数量合计 = dto.明细.Sum(l => l.数量);
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [原料出库单]([单号],[生产车间],[日期],[电脑单号],[领料备注],[制单人],[操作员],[数量],[审核],[备注])
VALUES(@单号,@生产车间,@日期,@电脑单号,@领料备注,@制单人,@操作员,@数量,'0',@备注)",
            new { 单号, dto.生产车间, 日期 = now, dto.电脑单号, dto.领料备注, dto.制单人, 操作员 = user, 数量 = 数量合计, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [原料出库明细单]([单号],[啤机生产单号],[开单日期],[啤机外发单号],[原料编号],[原料名称],[产地],[每包重量],[单位],[数量],[备注])
VALUES(@单号,@啤机生产单号,@开单日期,@啤机外发单号,@原料编号,@原料名称,@产地,@每包重量,@单位,@数量,@备注)",
                new { 单号, l.啤机生产单号, l.开单日期, l.啤机外发单号, l.原料编号, l.原料名称, l.产地, l.每包重量, l.单位, l.数量, l.备注 }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<PlasticRawMaterialStockIssueHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [原料出库单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [生产车间] LIKE @kw OR [制单人] LIKE @kw;
SELECT [ID],[单号],[生产车间],[日期],[电脑单号],[领料备注],[制单人],[操作员],[数量],[审核],[审核人],[备注]
FROM [原料出库单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [生产车间] LIKE @kw OR [制单人] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PlasticRawMaterialStockIssueHeaderDto>()).AsList();
        return new PagedResult<PlasticRawMaterialStockIssueHeaderDto>(items, total);
    }

    public async Task<PlasticRawMaterialStockIssueDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[生产车间],[日期],[电脑单号],[领料备注],[制单人],[操作员],[数量],[审核],[审核人],[备注]
FROM [原料出库单] WHERE [单号]=@单号;
SELECT [ID],[啤机生产单号],[开单日期],[啤机外发单号],[原料编号],[原料名称],[产地],[每包重量],[单位],[数量],[备注]
FROM [原料出库明细单] WHERE [单号]=@单号 ORDER BY [ID];", new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PlasticRawMaterialStockIssueHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PlasticRawMaterialStockIssueLineDto>()).AsList();
        return new PlasticRawMaterialStockIssueDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [原料出库单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的原料出库单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [原料出库明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [原料出库单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
