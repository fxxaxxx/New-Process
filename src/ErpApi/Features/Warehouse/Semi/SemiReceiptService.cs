using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Warehouse.Semi;

// 半成品入仓（裁片/半成品入半成品仓）。两层：半成品入仓单 + 半成品入仓明细单(单号 主从 FK)。
// 单价手工，金额=数量×单价；不做加权成本。物料维度。审核位仅在单头(明细表无审核列)。
public sealed class SemiReceiptService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "半成品入仓单";
    public const string Prefix = "BR";

    public async Task<string> CreateAsync(SemiReceiptCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("半成品入仓至少要有一行明细");
        if (string.IsNullOrWhiteSpace(dto.仓库)) throw new ArgumentException("仓库必填");
        var now = DateTime.Now;
        var 数量 = dto.明细.Sum(l => l.数量);
        var 金额 = dto.明细.Sum(l => l.数量 * (l.单价 ?? 0m));

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [半成品入仓单]([单号],[日期],[供应商编号],[供应商名称],[部门],[生产单号],[款号],[仓库],[数量],[金额],[操作员],[审核],[备注])
VALUES(@单号,@日期,@供应商编号,@供应商名称,@部门,@生产单号,@款号,@仓库,@数量,@金额,@操作员,'0',@备注)",
            new { 单号, 日期 = now, dto.供应商编号, dto.供应商名称, dto.部门, dto.生产单号, dto.款号, dto.仓库, 数量, 金额, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [半成品入仓明细单]([单号],[日期],[仓库],[生产单号],[款号],[物料编号],[物料名称],[规格],[颜色],[单位],[数量],[单价],[金额])
VALUES(@单号,@日期,@仓库,@生产单号,@款号,@物料编号,@物料名称,@规格,@颜色,@单位,@数量,@单价,@金额)",
                new
                {
                    单号, 日期 = now, dto.仓库, dto.生产单号, dto.款号,
                    l.物料编号, l.物料名称, l.规格, l.颜色, l.单位, l.数量, 单价 = l.单价 ?? 0m, 金额 = l.数量 * (l.单价 ?? 0m)
                }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<SemiReceiptHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [半成品入仓单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [仓库] LIKE @kw;
SELECT [ID],[单号],[仓库],[日期],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [半成品入仓单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [仓库] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<SemiReceiptHeaderDto>()).AsList();
        return new PagedResult<SemiReceiptHeaderDto>(items, total);
    }

    public async Task<SemiReceiptDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[仓库],[日期],[数量],[金额],[操作员],[审核],[审核人],[备注] FROM [半成品入仓单] WHERE [单号]=@单号;
SELECT [ID],[生产单号],[物料编号],[物料名称],[规格],[颜色],[单位],[数量],[单价],[金额] FROM [半成品入仓明细单] WHERE [单号]=@单号 ORDER BY [ID];",
            new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<SemiReceiptHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<SemiReceiptLineRowDto>()).AsList();
        return new SemiReceiptDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [半成品入仓单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的半成品入仓单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [半成品入仓明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [半成品入仓单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
