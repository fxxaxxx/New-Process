using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Plastics.PlasticIssue;

// 塑胶领料单(库存−)。两层:塑胶领料单 + 塑胶领料明细单。审核后由 PlasticInventoryService 实时聚合(−)。
public sealed class PlasticIssueService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "塑胶领料单";
    public const string Prefix = "SLL";

    public async Task<string> CreateAsync(PlasticIssueCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("塑胶领料单至少要有一行物料明细");
        if (string.IsNullOrWhiteSpace(dto.仓库)) throw new ArgumentException("塑胶领料单必须指定仓库");
        var 数量合计 = dto.明细.Sum(l => l.数量);
        var 金额合计 = dto.明细.Sum(l => l.数量 * (l.单价 ?? 0));
        var now = DateTime.Now;
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);
        await c.ExecuteAsync(@"
INSERT INTO [塑胶领料单]([单号],[日期],[领料部门],[领料人],[仓库],[数量],[金额],[操作员],[审核],[备注],[胶箱数],[纸箱数],[钙塑箱数],[卡板数],[收件人],[电脑单号],[领料备注])
VALUES(@单号,@日期,@领料部门,@领料人,@仓库,@数量,@金额,@操作员,'0',@备注,@胶箱数,@纸箱数,@钙塑箱数,@卡板数,@收件人,@电脑单号,@领料备注)",
            new { 单号, 日期 = now, dto.领料部门, dto.领料人, dto.仓库, 数量 = 数量合计, 金额 = 金额合计, 操作员 = user, dto.备注,
                  dto.胶箱数, dto.纸箱数, dto.钙塑箱数, dto.卡板数, dto.收件人, dto.电脑单号, dto.领料备注 }, tx);
        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [塑胶领料明细单]([单号],[日期],[仓库],[装配采购],[生产单号],[款号],[物料编号],[模具编号],[物料名称],[规格],[颜色],[色粉号],[用料名称],[仓位号],[单位],[数量],[单价],[金额],[备注])
VALUES(@单号,@日期,@仓库,@装配采购,@生产单号,@款号,@物料编号,@模具编号,@物料名称,@规格,@颜色,@色粉号,@用料名称,@仓位号,@单位,@数量,@单价,@金额,@备注)",
                new { 单号, 日期 = now, dto.仓库, l.装配采购, l.生产单号, l.款号, l.物料编号, l.模具编号, l.物料名称, l.规格, l.颜色, l.色粉号, l.用料名称, l.仓位号, l.单位,
                      l.数量, 单价 = l.单价 ?? 0, 金额 = l.数量 * (l.单价 ?? 0), l.备注 }, tx);
        tx.Commit();
        return 单号;
    }

    public async Task<PagedResult<PlasticIssueHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [塑胶领料单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [领料人] LIKE @kw OR [备注] LIKE @kw;
SELECT [ID],[单号],[日期],[领料部门],[领料人],[仓库],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [塑胶领料单] WHERE @kw IS NULL OR [单号] LIKE @kw OR [领料人] LIKE @kw OR [备注] LIKE @kw
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;", new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PlasticIssueHeaderDto>()).AsList();
        return new PagedResult<PlasticIssueHeaderDto>(items, total);
    }

    public async Task<PlasticIssueDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[领料部门],[领料人],[仓库],[数量],[金额],[操作员],[审核],[审核人],[备注],[胶箱数],[纸箱数],[钙塑箱数],[卡板数],[收件人],[电脑单号],[领料备注]
FROM [塑胶领料单] WHERE [单号]=@单号;
SELECT [ID],[装配采购],[生产单号],[款号],[物料编号],[模具编号],[物料名称],[规格],[颜色],[色粉号],[用料名称],[仓位号],[单位],[数量],[单价],[金额],[备注]
FROM [塑胶领料明细单] WHERE [单号]=@单号 ORDER BY [ID];", new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PlasticIssueHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PlasticIssueLineDto>()).AsList();
        return new PlasticIssueDetailDto { 单头 = header, 明细 = lines };
    }

    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [塑胶领料单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的塑胶领料单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [塑胶领料明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [塑胶领料单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
