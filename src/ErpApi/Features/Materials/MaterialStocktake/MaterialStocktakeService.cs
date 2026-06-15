using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Inventory;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Materials.MaterialStocktake;

// 物料盘点（盈亏）。两层：盘点单 + 盘点明细单(单号串联)。审核位仅在单头。
// BasisAsync 从 MaterialInventoryService.ListAsync 取系统数量；盈亏=盘点−系统；审核后盈亏入库存(库存引擎)。
// 数量列为 real，服务端传 decimal(SQL 隐式转)；读回 CAST decimal。
public sealed class MaterialStocktakeService(
    ISqlConnectionFactory factory, IDocumentNumberGenerator docNo, IMaterialInventoryService inventory)
{
    public const string DocType = "盘点单";
    public const string Prefix = "PD";

    public async Task<IReadOnlyList<MaterialStocktakeBasisRow>> BasisAsync(string 仓库)
    {
        var inv = await inventory.ListAsync(仓库, null);
        return inv.Select(r => new MaterialStocktakeBasisRow
        {
            物料编号 = r.物料编号, 物料名称 = r.物料名称, 规格 = r.规格, 单位 = r.单位, 系统数量 = r.库存数量
        }).ToList();
    }

    public async Task<string> CreateAsync(MaterialStocktakeCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("盘点单至少要有一行明细");
        if (string.IsNullOrWhiteSpace(dto.仓库)) throw new ArgumentException("仓库必填");
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [盘点单]([单号],[日期],[仓库],[操作员],[审核],[备注])
VALUES(@单号,@日期,@仓库,@操作员,'0',@备注)",
            new { 单号, 日期 = now, dto.仓库, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [盘点明细单]([单号],[日期],[仓库],[物料编号],[物料名称],[规格],[单位],[系统数量],[盘点数量],[盈亏数量])
VALUES(@单号,@日期,@仓库,@物料编号,@物料名称,@规格,@单位,@系统数量,@盘点数量,@盈亏数量)",
                new
                {
                    单号, 日期 = now, dto.仓库, l.物料编号, l.物料名称, l.规格, l.单位,
                    l.系统数量, l.盘点数量, 盈亏数量 = l.盘点数量 - l.系统数量
                }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<MaterialStocktakeHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [盘点单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [仓库] LIKE @kw OR [备注] LIKE @kw;
SELECT [ID],[单号],[仓库],[日期],[操作员],[审核],[审核人],[备注]
FROM [盘点单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [仓库] LIKE @kw OR [备注] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<MaterialStocktakeHeaderDto>()).AsList();
        return new PagedResult<MaterialStocktakeHeaderDto>(items, total);
    }

    public async Task<MaterialStocktakeDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[仓库],[日期],[操作员],[审核],[审核人],[备注] FROM [盘点单] WHERE [单号]=@单号;
SELECT [ID],[物料编号],[物料名称],[规格],[单位],
       CAST([系统数量] AS decimal(18,4)) AS 系统数量, CAST([盘点数量] AS decimal(18,4)) AS 盘点数量, CAST([盈亏数量] AS decimal(18,4)) AS 盈亏数量
FROM [盘点明细单] WHERE [单号]=@单号 ORDER BY [ID];",
            new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<MaterialStocktakeHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<MaterialStocktakeLineRowDto>()).AsList();
        return new MaterialStocktakeDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [盘点单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的盘点单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [盘点明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [盘点单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
