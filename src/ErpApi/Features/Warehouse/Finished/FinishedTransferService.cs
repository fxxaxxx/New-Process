using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Warehouse.Finished;

// 成品调拨（跨仓转移）。两层：成品调拨单 + 成品调拨明细单(单号 主从 FK)。
// 单头无 仓库/数量；源/目标仓库在头层 DTO，写入每条明细。审核后 源仓库−数量、目标仓库+数量(FinishedGoodsAsync 双腿)。
public sealed class FinishedTransferService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "成品调拨单";
    public const string Prefix = "CD";

    public async Task<string> CreateAsync(FinishedTransferCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("成品调拨至少要有一行明细");
        if (string.IsNullOrWhiteSpace(dto.源仓库) || string.IsNullOrWhiteSpace(dto.目标仓库)) throw new ArgumentException("源仓库/目标仓库必填");
        if (dto.源仓库 == dto.目标仓库) throw new ArgumentException("源仓库与目标仓库不能相同");
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [成品调拨单]([单号],[日期],[客户编号],[客户名称],[操作员],[审核],[备注])
VALUES(@单号,@日期,@客户编号,@客户名称,@操作员,'0',@备注)",
            new { 单号, 日期 = now, dto.客户编号, dto.客户名称, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [成品调拨明细单]([单号],[出仓单号],[日期],[客户编号],[客户名称],[源仓库],[目标仓库],[生产单号],[款号],[款式],[床号],[色号],[颜色],[尺码],[数量],[单价],[金额],[审核])
VALUES(@单号,@出仓单号,@日期,@客户编号,@客户名称,@源仓库,@目标仓库,@生产单号,@款号,@款式,@床号,@色号,@颜色,@尺码,@数量,@单价,@金额,'0')",
                new
                {
                    单号, dto.出仓单号, 日期 = now, dto.客户编号, dto.客户名称, dto.源仓库, dto.目标仓库,
                    dto.生产单号, dto.款号, dto.款式, dto.床号, l.色号, l.颜色, l.尺码,
                    l.数量, 单价 = l.单价 ?? 0m, 金额 = l.数量 * (l.单价 ?? 0m)
                }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<FinishedTransferHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 1000) size = 1000;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [成品调拨单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [客户名称] LIKE @kw;
SELECT [ID],[单号],[客户名称],[日期],[操作员],[审核],[审核人],[备注]
FROM [成品调拨单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [客户名称] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<FinishedTransferHeaderDto>()).AsList();
        return new PagedResult<FinishedTransferHeaderDto>(items, total);
    }

    public async Task<FinishedTransferDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[客户名称],[日期],[操作员],[审核],[审核人],[备注] FROM [成品调拨单] WHERE [单号]=@单号;
SELECT [ID],[源仓库],[目标仓库],[款号],[色号],[颜色],[尺码],[数量],[单价],[金额] FROM [成品调拨明细单] WHERE [单号]=@单号 ORDER BY [ID];",
            new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<FinishedTransferHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<FinishedTransferLineRowDto>()).AsList();
        return new FinishedTransferDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [成品调拨单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的成品调拨单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [成品调拨明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [成品调拨单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
