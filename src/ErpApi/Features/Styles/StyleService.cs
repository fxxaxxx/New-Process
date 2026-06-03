using Dapper;
using ErpApi.Data;
using ErpApi.Infrastructure.Db;
using Microsoft.EntityFrameworkCore;
namespace ErpApi.Features.Styles;

public sealed class StyleService(ISqlConnectionFactory factory, ErpDbContext db)
{
    // 款式全貌：主档 + 颜色集 + 尺码集 + 工序工价 + BOM物料（订单/制单页面据此带出数据）
    // 注：EF(主档/工序/物料) 与 Dapper(颜色/尺码) 用两条连接做只读聚合，非原子快照——本服务只读，足够。
    public async Task<StyleFullDto?> GetFullAsync(string 款号)
    {
        var 主档 = await db.款号总表.AsNoTracking().FirstOrDefaultAsync(s => s.款号 == 款号);
        if (主档 is null) return null;

        using var c = factory.Create();
        var 颜色 = (await c.QueryAsync<StyleColorDto>(
            "SELECT [颜色编号],[颜色名称] FROM [款号颜色表] WHERE [款号]=@款号 ORDER BY [ID]",
            new { 款号 })).AsList();
        var 尺码 = (await c.QueryAsync<string>(
            "SELECT [尺码] FROM [款号尺码表] WHERE [款号]=@款号 ORDER BY [ID]",
            new { 款号 })).AsList();
        var 工序 = await db.款号明细表.AsNoTracking()
            .Where(x => x.款号 == 款号).OrderBy(x => x.工序号).ToListAsync();
        var 物料 = await db.款号物料明细表.AsNoTracking()
            .Where(x => x.款号 == 款号).OrderBy(x => x.ID).ToListAsync();
        return new StyleFullDto(主档, 颜色, 尺码, 工序, 物料);
    }

    // 整组替换颜色集（先删后插；ID 列无自增，写成排序号保证顺序稳定）
    public async Task ReplaceColorsAsync(string 款号, IReadOnlyList<StyleColorDto> colors)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var exists = await c.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM [款号总表] WHERE [款号]=@款号", new { 款号 }, tx);
        if (exists == 0) throw new InvalidOperationException($"款号 [{款号}] 不存在。");
        var 款式 = await c.ExecuteScalarAsync<string?>(
            "SELECT [款式] FROM [款号总表] WHERE [款号]=@款号", new { 款号 }, tx);
        await c.ExecuteAsync("DELETE FROM [款号颜色表] WHERE [款号]=@款号", new { 款号 }, tx);
        for (var i = 0; i < colors.Count; i++)
            await c.ExecuteAsync(@"
INSERT INTO [款号颜色表]([款号],[款式],[颜色编号],[颜色名称],[ID])
VALUES(@款号,@款式,@颜色编号,@颜色名称,@ID)",
                new { 款号, 款式, colors[i].颜色编号, colors[i].颜色名称, ID = (long)(i + 1) }, tx);
        tx.Commit();
    }

    // 整组替换尺码集（顺序即穿着顺序 S/M/L/XL，用 ID 列保序）
    public async Task ReplaceSizesAsync(string 款号, IReadOnlyList<string> sizes)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var exists = await c.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM [款号总表] WHERE [款号]=@款号", new { 款号 }, tx);
        if (exists == 0) throw new InvalidOperationException($"款号 [{款号}] 不存在。");
        var 款式 = await c.ExecuteScalarAsync<string?>(
            "SELECT [款式] FROM [款号总表] WHERE [款号]=@款号", new { 款号 }, tx);
        await c.ExecuteAsync("DELETE FROM [款号尺码表] WHERE [款号]=@款号", new { 款号 }, tx);
        for (var i = 0; i < sizes.Count; i++)
            await c.ExecuteAsync(@"
INSERT INTO [款号尺码表]([款号],[款式],[尺码],[ID]) VALUES(@款号,@款式,@尺码,@ID)",
                new { 款号, 款式, 尺码 = sizes[i], ID = (long)(i + 1) }, tx);
        tx.Commit();
    }
}
