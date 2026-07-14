using Dapper;
using ErpApi.Data;
using ErpApi.Data.Entities;
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

    // BOM物料设置轻量载入：最新款式、物料头、明细、扩展和报价。
    public async Task<StyleMaterialsViewDto?> GetMaterialsViewAsync(string 款号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var multi = await c.QueryMultipleAsync(@"
SELECT TOP (1) [款号],[款式]
FROM [款号总表]
WHERE [款号]=@款号
ORDER BY [ID] DESC;
SELECT [ID],[日期],[顺序],[客户编号],[客户名称],[款号],[款式],[物料类别],
       [物料编号],[物料名称],[规格],[颜色],[单位],[使用数量],[工模编号],[备注]
FROM [款号物料明细表]
WHERE [款号]=@款号
ORDER BY CASE WHEN TRY_CONVERT(int,[顺序]) IS NULL THEN 1 ELSE 0 END,
         TRY_CONVERT(int,[顺序]), [ID];
SELECT TOP (1) [产品编号],[单位],[备注]
FROM [款号物料总表]
WHERE [款号]=@款号
ORDER BY [ID] DESC;
SELECT TOP (1) [产品装配名称],[配件编号],[共用物料编号],[装配方式],[类别],
       [库存单价HK],[其他成本HK],[需求用量],[单位],[半成品计算库存],[备注内容],
       [调整审核],[审核人],[审核时间]
FROM [半成品共用物料设置]
WHERE [产品货号]=@款号
ORDER BY [ID] DESC;
SELECT [ID],[物料编号],[物料名称],[合作方类型],[合作方编号],[合作方名称],
       [报价日期],[货币],[单价],[港币价],[对比相差],[相差比例],[是否默认],[顺序],[备注]
FROM [装配物料报价]
WHERE [产品货号]=@款号
ORDER BY [顺序],[ID];", new { 款号 });

        var style = await multi.ReadFirstOrDefaultAsync<StyleHeaderRow>();
        if (style is null) return null;
        var 物料 = (await multi.ReadAsync<款号物料明细表>()).AsList();
        var header = await multi.ReadFirstOrDefaultAsync<MaterialHeaderRow>();
        var 扩展 = await multi.ReadFirstOrDefaultAsync<AssemblyMaterialExtensionDto>()
            ?? new AssemblyMaterialExtensionDto(
                style.款式, header?.产品编号, null, null, null, null, null, null,
                header?.单位, false, header?.备注, false, null, null);
        var 报价 = (await multi.ReadAsync<AssemblyMaterialQuoteDto>()).AsList();
        return new StyleMaterialsViewDto(款号, style.款式, 物料, 扩展, 报价);
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

    // 整组替换 BOM、装配扩展和报价；三部分共用一个 Dapper 事务。
    public async Task ReplaceMaterialsAsync(string 款号, BomSaveDto dto, bool canEditPrices = true)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        try
        {
            var exists = await c.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM [款号总表] WHERE [款号]=@款号", new { 款号 }, tx);
            if (exists == 0) throw new InvalidOperationException($"款号 [{款号}] 不存在。");

            var audited = await c.ExecuteScalarAsync<bool>(@"
SELECT CAST(ISNULL([调整审核],0) AS bit)
FROM [半成品共用物料设置] WITH (UPDLOCK, HOLDLOCK)
WHERE [产品货号]=@款号;", new { 款号 }, tx);
            if (audited)
                throw new InvalidOperationException($"款号 [{款号}] 已审核，不能保存，请先反审核。");

            var saveDto = dto;
            if (!canEditPrices && (dto.扩展 is not null || dto.报价 is not null))
            {
                var existingExtension = dto.扩展 is null
                    ? null
                    : await c.QueryFirstOrDefaultAsync<AssemblyMaterialExtensionDto>(@"
SELECT TOP (1) [产品装配名称],[配件编号],[共用物料编号],[装配方式],[类别],
       [库存单价HK],[其他成本HK],[需求用量],[单位],[半成品计算库存],[备注内容],
       [调整审核],[审核人],[审核时间]
FROM [半成品共用物料设置] WITH (UPDLOCK, HOLDLOCK)
WHERE [产品货号]=@款号
ORDER BY [ID] DESC;", new { 款号 }, tx);
                var existingQuotes = dto.报价 is null
                    ? []
                    : (await c.QueryAsync<AssemblyMaterialQuoteDto>(@"
SELECT [ID],[物料编号],[物料名称],[合作方类型],[合作方编号],[合作方名称],
       [报价日期],[货币],[单价],[港币价],[对比相差],[相差比例],[是否默认],[顺序],[备注]
FROM [装配物料报价] WITH (UPDLOCK, HOLDLOCK)
WHERE [产品货号]=@款号
ORDER BY [顺序],[ID];", new { 款号 }, tx)).AsList();
                saveDto = StyleMaterialsPricePolicy.PreserveProtectedPrices(
                    dto, existingExtension, existingQuotes);
            }

            ValidateQuotes(saveDto.报价);

            var 款式 = await c.ExecuteScalarAsync<string?>(
                "SELECT TOP (1) [款式] FROM [款号总表] WHERE [款号]=@款号 ORDER BY [ID] DESC", new { 款号 }, tx);
            await c.ExecuteAsync("DELETE FROM [款号物料明细表] WHERE [款号]=@款号", new { 款号 }, tx);
            var materials = saveDto.明细 ?? [];
            for (var i = 0; i < materials.Count; i++)
            {
                var m = materials[i];
                await c.ExecuteAsync(@"
INSERT INTO [款号物料明细表]([款号],[款式],[顺序],[客户编号],[客户名称],[日期],[物料编号],[物料名称],[物料类别],[规格],[颜色],[单位],[使用数量],[工模编号],[备注])
VALUES(@款号,@款式,@顺序,@客户编号,@客户名称,@日期,@物料编号,@物料名称,@物料类别,@规格,@颜色,@单位,@使用数量,@工模编号,@备注)",
                    new
                    {
                        款号, 款式, 顺序 = (i + 1).ToString(),
                        saveDto.客户编号, saveDto.客户名称, saveDto.日期,
                        m.物料编号, m.物料名称, m.物料类别, m.规格, m.颜色,
                        m.工模编号,
                        单位 = string.IsNullOrWhiteSpace(m.单位) ? saveDto.单位 : m.单位,
                        m.使用数量, m.备注
                    }, tx);
            }

            if (saveDto.扩展 is not null)
                await UpsertExtensionAsync(c, tx, 款号, saveDto.扩展);

            if (saveDto.报价 is not null)
            {
                await c.ExecuteAsync("DELETE FROM [装配物料报价] WHERE [产品货号]=@款号", new { 款号 }, tx);
                foreach (var q in saveDto.报价)
                    await c.ExecuteAsync(@"
INSERT INTO [装配物料报价]([产品货号],[物料编号],[物料名称],[合作方类型],[合作方编号],[合作方名称],
    [报价日期],[货币],[单价],[港币价],[对比相差],[相差比例],[是否默认],[顺序],[备注])
VALUES(@产品货号,@物料编号,@物料名称,@合作方类型,@合作方编号,@合作方名称,
    @报价日期,@货币,@单价,@港币价,@对比相差,@相差比例,@是否默认,@顺序,@备注)",
                        new
                        {
                            产品货号 = 款号, q.物料编号, q.物料名称, q.合作方类型, q.合作方编号,
                            q.合作方名称, q.报价日期, q.货币, q.单价, q.港币价, q.对比相差,
                            q.相差比例, q.是否默认, q.顺序, q.备注
                        }, tx);
            }

            tx.Commit();
        }
        catch
        {
            try { tx.Rollback(); } catch { }
            throw;
        }
    }

    public async Task SetAuditAsync(string 款号, bool audited, string user)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        try
        {
            var style = await c.QuerySingleOrDefaultAsync<StyleHeaderRow>(@"
SELECT TOP (1) [款号],[款式] FROM [款号总表]
WHERE [款号]=@款号 ORDER BY [ID] DESC", new { 款号 }, tx);
            if (style is null) throw new InvalidOperationException($"款号 [{款号}] 不存在。");
            var existing = await c.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM [半成品共用物料设置] WHERE [产品货号]=@款号", new { 款号 }, tx);
            if (!audited && existing == 0)
                throw new InvalidOperationException($"款号 [{款号}] 尚未审核。");
            var header = await c.QuerySingleOrDefaultAsync<MaterialHeaderRow>(@"
SELECT TOP (1) [产品编号],[单位],[备注]
FROM [款号物料总表] WHERE [款号]=@款号 ORDER BY [ID] DESC", new { 款号 }, tx);

            await c.ExecuteAsync(@"
MERGE [半成品共用物料设置] AS target
USING (SELECT @产品货号 AS [产品货号], @产品装配名称 AS [产品装配名称],
              @配件编号 AS [配件编号], @单位 AS [单位], @备注内容 AS [备注内容]) AS source
ON target.[产品货号] = source.[产品货号]
WHEN MATCHED THEN UPDATE SET
    [调整审核]=@调整审核,
    [审核人]=CASE WHEN @调整审核=1 THEN @审核人 ELSE NULL END,
    [审核时间]=CASE WHEN @调整审核=1 THEN SYSDATETIME() ELSE NULL END
WHEN NOT MATCHED AND @调整审核=1 THEN
    INSERT([产品货号],[产品装配名称],[配件编号],[单位],[备注内容],[调整审核],[审核人],[审核时间])
    VALUES(source.[产品货号],source.[产品装配名称],source.[配件编号],source.[单位],source.[备注内容],@调整审核,@审核人,SYSDATETIME());
", new
            {
                产品货号 = 款号, 产品装配名称 = style.款式, 配件编号 = header?.产品编号,
                单位 = header?.单位, 备注内容 = header?.备注,
                调整审核 = audited ? 1 : 0, 审核人 = user
            }, tx);
            tx.Commit();
        }
        catch
        {
            try { tx.Rollback(); } catch { }
            throw;
        }
    }

    private static void ValidateQuotes(IReadOnlyList<AssemblyMaterialQuoteDto>? quotes)
    {
        if (quotes is null) return;
        foreach (var quote in quotes)
            if (quote.合作方类型 is not ("加工厂" or "供应商"))
                throw new InvalidOperationException("报价合作方类型必须是加工厂或供应商。");
    }

    private static Task<int> UpsertExtensionAsync(
        System.Data.IDbConnection c, System.Data.IDbTransaction tx,
        string 产品货号, AssemblyMaterialExtensionDto extension)
        => c.ExecuteAsync(@"
MERGE [半成品共用物料设置] AS target
USING (SELECT @产品货号 AS [产品货号]) AS source
ON target.[产品货号] = source.[产品货号]
WHEN MATCHED THEN UPDATE SET
    [产品装配名称]=@产品装配名称,[配件编号]=@配件编号,[共用物料编号]=@共用物料编号,
    [装配方式]=@装配方式,[类别]=@类别,[库存单价HK]=@库存单价HK,[其他成本HK]=@其他成本HK,
    [需求用量]=@需求用量,[单位]=@单位,[半成品计算库存]=@半成品计算库存,[备注内容]=@备注内容
WHEN NOT MATCHED THEN
    INSERT([产品货号],[产品装配名称],[配件编号],[共用物料编号],[装配方式],[类别],
           [库存单价HK],[其他成本HK],[需求用量],[单位],[半成品计算库存],[备注内容])
    VALUES(@产品货号,@产品装配名称,@配件编号,@共用物料编号,@装配方式,@类别,
           @库存单价HK,@其他成本HK,@需求用量,@单位,@半成品计算库存,@备注内容);",
            new
            {
                产品货号, extension.产品装配名称, extension.配件编号, extension.共用物料编号,
                extension.装配方式, extension.类别, extension.库存单价HK, extension.其他成本HK,
                extension.需求用量, extension.单位, extension.半成品计算库存, extension.备注内容
            }, tx);

    private sealed class StyleHeaderRow
    {
        public string? 款号 { get; set; }
        public string? 款式 { get; set; }
    }

    private sealed class MaterialHeaderRow
    {
        public string? 产品编号 { get; set; }
        public string? 单位 { get; set; }
        public string? 备注 { get; set; }
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
