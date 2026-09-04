using Dapper;
using ErpApi.Engines.Bom;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Engines.Inventory;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Logging;
namespace ErpApi.Features.Production;

public sealed class ProductionService(
    ISqlConnectionFactory factory,
    IDocumentNumberGenerator docNo,
    IMaterialInventoryService inventory,
    ILogger<ProductionService>? log = null)
{
    public const string DocType = "生产制单";
    public const string Prefix = "SC";   // 生产单号 = SC + yyyyMMdd + 3位流水

    // 创建（一单多货号）：生成单号 → 插单头 → 逐货号(插货号明细 + 色码数量 + 算3工序 + 算4BOM) → 汇总回写单头 → 订单回写
    public async Task<string> CreateAsync(ProductionNoticeCreateDto dto, string user)
    {
        if (dto.货号明细.Count == 0) throw new ArgumentException("生产通知单至少要有一个货号");
        foreach (var line in dto.货号明细)
        {
            if (string.IsNullOrWhiteSpace(line.BOM款号)) throw new ArgumentException("每个货号必须指定 BOM款号");
            if (line.数量明细.Count == 0) throw new ArgumentException($"货号 [{line.货号}] 至少要有一行颜色尺码数量");
        }

        var 计划数量 = dto.货号明细.Sum(line => line.数量明细.Sum(q => q.数量));
        // 接单数量可手动输入;留空回落为明细合计(计划数量)
        var 接单数量 = dto.接单数量 ?? 计划数量;
        // 代表款号/款式：取第一个货号行（兼容列表/下游仍读单头.款号）
        var 代表款号 = dto.货号明细[0].BOM款号;
        var 代表款式 = dto.货号明细[0].款号名称;
        var now = DateTime.Now;
        var 下单日期 = dto.下单日期 ?? now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();

        // 生产单号可手动指定(如沿用客户单号);留空则自动生成。手动指定时查重。
        string 生产单号;
        if (!string.IsNullOrWhiteSpace(dto.生产单号))
        {
            生产单号 = dto.生产单号.Trim();
            var dup = await c.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
            if (dup > 0) throw new ArgumentException($"生产单号 [{生产单号}] 已存在");
        }
        else 生产单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        // 1. 单头（含新字段；工序数/工序单价/物料金额 先置 0，逐货号展开后汇总回写）
        await c.ExecuteAsync(@"
INSERT INTO [生产制单]([生产单号],[款号],[款式],[合同号],[客户款号],[客户编号],[客户名称],
    [加工厂编号],[加工厂名称],[日期],[交货日期],[制单人],[跟单员],[操作员],
    [计划数量],[接单数量],[工序数],[工序单价],[物料金额],[出货单价],
    [订单类型],[标识],[装箱方式],[订单总箱数],[默认单价],
    [审核],[完成],[工序审核],[BOM审核],[下单日期],[备注])
VALUES(@生产单号,@款号,@款式,@合同号,@客户款号,@客户编号,@客户名称,
    @加工厂编号,@加工厂名称,@日期,@交货日期,@制单人,@跟单员,@制单人,
    @计划数量,@接单数量,0,0,0,NULL,
    @订单类型,@标识,@装箱方式,@订单总箱数,@默认单价,
    '0',N'否','0','0',@下单日期,@备注)",
            new
            {
                生产单号, 款号 = 代表款号, 款式 = 代表款式, dto.合同号, dto.客户款号, dto.客户编号, dto.客户名称,
                dto.加工厂编号, dto.加工厂名称, 日期 = now, dto.交货日期, 制单人 = user, dto.跟单员,
                计划数量, 接单数量, dto.订单类型, dto.标识, dto.装箱方式, dto.订单总箱数, dto.默认单价, 下单日期, dto.备注
            }, tx);

        decimal 工序数合计 = 0, 工序单价合计 = 0, 物料金额合计 = 0;
        var 序号 = 0;

        foreach (var line in dto.货号明细)
        {
            序号++;
            var 货号 = line.货号;
            var BOM款号 = line.BOM款号;
            var 款号名称 = line.款号名称;
            var 行数量 = line.数量明细.Sum(q => q.数量);

            // 2. 货号明细行
            await c.ExecuteAsync(@"
INSERT INTO [生产制单货号]([生产单号],[序号],[货号],[BOM款号],[款号名称],[数量],[比例],[分析])
VALUES(@生产单号,@序号,@货号,@BOM款号,@款号名称,@数量,@比例,@分析)",
                new { 生产单号, 序号, 货号, BOM款号, 款号名称, 数量 = 行数量, line.比例, 分析 = line.分析 }, tx);

            // 3. 色×码数量（带货号；款号=该货号 BOM款号、款式=款号名称）
            foreach (var q in line.数量明细)
                await c.ExecuteAsync(@"
INSERT INTO [生产制单数量]([生产单号],[货号],[款号],[款式],[客户款号],[合同号],[日期],
    [客户编号],[客户名称],[加工厂编号],[加工厂名称],[颜色],[尺码],[数量])
VALUES(@生产单号,@货号,@款号,@款式,@客户款号,@合同号,@日期,
    @客户编号,@客户名称,@加工厂编号,@加工厂名称,@颜色,@尺码,@数量)",
                    new
                    {
                        生产单号, 货号, 款号 = BOM款号, 款式 = 款号名称, dto.客户款号, dto.合同号, 日期 = now,
                        dto.客户编号, dto.客户名称, dto.加工厂编号, dto.加工厂名称, q.颜色, q.尺码, q.数量
                    }, tx);

            // 4. === 算法3 工费展开（带货号）===
            // 把款式工序工价复制为本单工序表（复制而非引用：下单后改款式工价不影响已下单据）。
            await c.ExecuteAsync(@"
INSERT INTO [生产制单工序表]([生产单号],[货号],[款号],[款式],[客户款号],[合同号],
    [工序号],[工序名称],[单价],[工序类型],[备注],[审核])
SELECT @生产单号,@货号,[款号],[款式],@客户款号,@合同号,
    [工序号],[工序名称],[单价],[工序类型],[备注],'0'
FROM [款号明细表] WHERE [款号]=@BOM款号",
                new { 生产单号, 货号, BOM款号, dto.客户款号, dto.合同号 }, tx);

            // 工序汇总（本货号工序数 + Σ单价 计入单头聚合）
            var 工序汇总 = await c.QueryFirstAsync<(int 工序数, decimal 工序单价)>(@"
SELECT COUNT(*) AS 工序数, ISNULL(SUM([单价]),0) AS 工序单价
FROM [款号明细表] WHERE [款号]=@BOM款号", new { BOM款号 }, tx);
            工序数合计 += 工序汇总.工序数;
            工序单价合计 += 工序汇总.工序单价;

            // 5. 算法4 BOM展开（带货号；总数量 = 使用数量 × 该货号数量）
            物料金额合计 += await ExpandBomAsync(c, tx, 生产单号, 货号, BOM款号, 款号名称,
                dto.客户款号, dto.合同号, 行数量, now);
        }

        // 6. 汇总回写单头
        await c.ExecuteAsync(@"
UPDATE [生产制单] SET [工序数]=@工序数,[工序单价]=@工序单价,[物料金额]=@物料金额
WHERE [生产单号]=@生产单号",
            new { 工序数 = 工序数合计, 工序单价 = 工序单价合计, 物料金额 = 物料金额合计, 生产单号 }, tx);

        // 7. 订单回写
        await LinkOrderAsync(c, tx, 生产单号, dto.订单单号);

        tx.Commit();
        return 生产单号;
    }

    // 表头修改：仅未审核可改(已审核 409,请先反审核)。只更新单头字段;货号明细/工序/BOM 已按下单快照固化,不在此改。
    public async Task<bool> UpdateHeaderAsync(string 生产单号, ProductionNoticeCreateDto dto, string user)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [生产制单] WITH (UPDLOCK, HOLDLOCK) WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的生产通知单不能修改，请先反审核。");

        await c.ExecuteAsync(@"
UPDATE [生产制单] SET
    [订单类型]=@订单类型,[标识]=@标识,[装箱方式]=@装箱方式,[订单总箱数]=@订单总箱数,
    [默认单价]=@默认单价,[客户编号]=@客户编号,[客户名称]=@客户名称,[客户款号]=@客户款号,[合同号]=@合同号,
    [加工厂编号]=@加工厂编号,[加工厂名称]=@加工厂名称,[交货日期]=@交货日期,[下单日期]=@下单日期,
    [跟单员]=@跟单员,[备注]=@备注,
    [接单数量]=CASE WHEN @接单数量 IS NULL THEN [接单数量] ELSE @接单数量 END
WHERE [生产单号]=@生产单号",
            new
            {
                生产单号, dto.订单类型, dto.标识, dto.装箱方式, dto.订单总箱数, dto.默认单价,
                dto.客户编号, dto.客户名称, dto.客户款号, dto.合同号,
                dto.加工厂编号, dto.加工厂名称, dto.交货日期, dto.下单日期,
                dto.跟单员, dto.备注, dto.接单数量
            }, tx);
        tx.Commit();
        return true;
    }

    // 分页列表（单头；关键字模糊匹配 生产单号/款号/款式/客户名称/合同号）
    // 领料应领明细:按生产单 BOM 展开快照取 应领=Σ总数量(需求侧,不扣库存)。
    // 档=来料 只留 物料资料 存在的行;档=塑胶 只留 物料资料 不存在的行(塑胶/未知档案)。
    // 档=半成品/成品 时返回该生产单在 半成品仓/成品仓 的现存净额(供给侧,装配部再领料用),见下方分支。
    public async Task<IReadOnlyList<IssueBasisRow>> IssueBasisAsync(string 生产单号, string? 档)
    {
        using var c = factory.Create();
        if (档 == "半成品") return await IssueBasisSemiAsync(c, 生产单号);
        if (档 == "成品") return await IssueBasisFinishedAsync(c, 生产单号);

        var mat = 档 == "来料" ? 1 : 0;
        var plastic = 档 == "塑胶" ? 1 : 0;
        var rows = await c.QueryAsync<IssueBasisRow>(@"
SELECT b.[生产单号], MAX(b.[货号]) AS 款号, b.[物料编号], MAX(b.[物料名称]) AS 物料名称,
       MAX(b.[规格]) AS 规格, MAX(b.[颜色]) AS 颜色, MAX(b.[单位]) AS 单位,
       SUM(ISNULL(b.[总数量],0)) AS 数量
FROM [生产BOM物料清单] b
WHERE b.[生产单号]=@生产单号
  AND (@mat=0 OR EXISTS(SELECT 1 FROM [物料资料] m WHERE m.[物料编号]=b.[物料编号]))
  AND (@plastic=0 OR NOT EXISTS(SELECT 1 FROM [物料资料] m WHERE m.[物料编号]=b.[物料编号]))
GROUP BY b.[生产单号], b.[物料编号]
ORDER BY b.[物料编号];", new { 生产单号, mat, plastic });
        return rows.AsList();
    }

    // 档=半成品：该生产单在半成品仓的现存净额 = 入仓(+) − 半成品领料(−) − 退仓(−) + 退库(+) − 报废(−)
    //   − 装配部领料单(仓库=半成品仓)已出口径(−)；审核标志在单头需 JOIN，按 物料编号 聚合只回正数行。
    private static async Task<IReadOnlyList<IssueBasisRow>> IssueBasisSemiAsync(SqlConnection c, string 生产单号)
    {
        var rows = await c.QueryAsync<IssueBasisRow>(@"
SELECT @生产单号 AS [生产单号], MAX(t.[货号]) AS [款号], t.[物料编号],
       MAX(t.[物料名称]) AS [物料名称], MAX(t.[规格]) AS [规格], MAX(t.[颜色]) AS [颜色], MAX(t.[单位]) AS [单位],
       SUM(t.[数量]) AS [数量]
FROM (
    SELECT d.[货号],d.[物料编号],d.[物料名称],d.[规格],d.[颜色],d.[单位], d.[数量] AS [数量]
        FROM [半成品入仓明细单] d JOIN [半成品入仓单] h ON h.[单号]=d.[单号]
        WHERE d.[生产单号]=@生产单号 AND d.[仓库]=N'半成品仓' AND ISNULL(h.[审核],'0')='1'
    UNION ALL
    SELECT d.[货号],d.[物料编号],d.[物料名称],d.[规格],d.[颜色],d.[单位], d.[数量]*-1
        FROM [半成品领料明细单] d JOIN [半成品领料单] h ON h.[单号]=d.[单号]
        WHERE d.[生产单号]=@生产单号 AND d.[仓库]=N'半成品仓' AND ISNULL(h.[审核],'0')='1'
    UNION ALL
    SELECT d.[货号],d.[物料编号],d.[物料名称],d.[规格],d.[颜色],d.[单位], d.[数量]*-1
        FROM [半成品退仓明细单] d JOIN [半成品退仓单] h ON h.[单号]=d.[单号]
        WHERE d.[生产单号]=@生产单号 AND d.[仓库]=N'半成品仓' AND ISNULL(h.[审核],'0')='1'
    UNION ALL
    SELECT d.[货号],d.[物料编号],d.[物料名称],d.[规格],d.[颜色],d.[单位], d.[数量]
        FROM [半成品退库明细单] d JOIN [半成品退库单] h ON h.[单号]=d.[单号]
        WHERE d.[生产单号]=@生产单号 AND d.[仓库]=N'半成品仓' AND ISNULL(h.[审核],'0')='1'
    UNION ALL
    SELECT d.[货号],d.[物料编号],d.[物料名称],d.[规格],d.[颜色],d.[单位], d.[数量]*-1
        FROM [半成品报废明细单] d JOIN [半成品报废单] h ON h.[单号]=d.[单号]
        WHERE d.[生产单号]=@生产单号 AND d.[仓库]=N'半成品仓' AND ISNULL(h.[审核],'0')='1'
    UNION ALL
    SELECT d.[款号],d.[物料编号],d.[物料名称],d.[规格],d.[颜色],d.[单位],
           (CASE WHEN d.[已出数量] IS NOT NULL THEN d.[已出数量] ELSE d.[数量] END) * -1
        FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号]
        WHERE d.[生产单号]=@生产单号 AND d.[仓库]=N'半成品仓'
          AND (ISNULL(d.[已出数量],0) > 0 OR ISNULL(h.[审核],'0')='1')
) t
GROUP BY t.[物料编号]
HAVING SUM(t.[数量]) > 0
ORDER BY t.[物料编号];", new { 生产单号 });
        return rows.AsList();
    }

    // 档=成品：该生产单的成品现存净额 = 入仓(+) + 退货(+) − 出仓(−) − 退仓(−)
    //   − 装配部领料单(仓库=成品仓)已出口径(−)；成品各明细单审核在明细行本身，领料单审核在单头需 JOIN。
    // 行映射：物料编号=款号、物料名称=款式、单位固定 PCS(供装配部返工领出)。
    private static async Task<IReadOnlyList<IssueBasisRow>> IssueBasisFinishedAsync(SqlConnection c, string 生产单号)
    {
        var rows = await c.QueryAsync<IssueBasisRow>(@"
SELECT @生产单号 AS [生产单号], t.[款号], t.[款号] AS [物料编号],
       MAX(t.[款式]) AS [物料名称], CAST(NULL AS nvarchar(20)) AS [规格],
       MAX(t.[颜色]) AS [颜色], N'PCS' AS [单位], SUM(t.[数量]) AS [数量]
FROM (
    SELECT d.[款号],d.[款式],d.[颜色], d.[数量] AS [数量] FROM [成品入仓明细单] d
        WHERE d.[生产单号]=@生产单号 AND ISNULL(d.[审核],'0')='1'
    UNION ALL
    SELECT d.[款号],d.[款式],d.[颜色], d.[数量] FROM [成品退货明细单] d
        WHERE d.[生产单号]=@生产单号 AND ISNULL(d.[审核],'0')='1'
    UNION ALL
    SELECT d.[款号],d.[款式],d.[颜色], d.[数量]*-1 FROM [成品出仓明细单] d
        WHERE d.[生产单号]=@生产单号 AND ISNULL(d.[审核],'0')='1'
    UNION ALL
    SELECT d.[款号],d.[款式],d.[颜色], d.[数量]*-1 FROM [成品退仓明细单] d
        WHERE d.[生产单号]=@生产单号 AND ISNULL(d.[审核],'0')='1'
    UNION ALL
    SELECT d.[款号],N'' AS [款式],d.[颜色],
           (CASE WHEN d.[已出数量] IS NOT NULL THEN d.[已出数量] ELSE d.[数量] END) * -1
        FROM [领料明细单] d JOIN [领料单] h ON h.[单号]=d.[单号]
        WHERE d.[生产单号]=@生产单号 AND d.[仓库]=N'成品仓'
          AND (ISNULL(d.[已出数量],0) > 0 OR ISNULL(h.[审核],'0')='1')
) t
GROUP BY t.[款号]
HAVING SUM(t.[数量]) > 0
ORDER BY t.[款号];", new { 生产单号 });
        return rows.AsList();
    }

    public async Task<PagedResult<ProductionHeaderDto>> ListAsync(int page, int size, string? keyword)
    {
        if (page < 1) page = 1;
        if (size < 1) size = 20;
        if (size > 1000) size = 1000;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";

        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [生产制单]
WHERE @kw IS NULL OR [生产单号] LIKE @kw OR [款号] LIKE @kw OR [款式] LIKE @kw
   OR [客户名称] LIKE @kw OR [合同号] LIKE @kw;
SELECT h.[ID],h.[生产单号],h.[款号],h.[款式],h.[合同号],h.[客户编号],h.[客户名称],h.[加工厂编号],h.[加工厂名称],
       h.[日期],h.[交货日期],h.[制单人],h.[跟单员],h.[计划数量],h.[接单数量],h.[工序数],h.[工序单价],h.[物料金额],h.[出货单价],
       h.[审核],h.[审核人],h.[完成],h.[备注],
       ISNULL(sr.[入半成品数量],0) AS [入半成品数量], ISNULL(fr.[入成品数量],0) AS [入成品数量]
FROM [生产制单] h
LEFT JOIN (
    SELECT d.[生产单号], SUM(d.[数量]) AS [入半成品数量]
    FROM [半成品入仓明细单] d JOIN [半成品入仓单] s ON s.[单号]=d.[单号]
    WHERE ISNULL(s.[审核],'0')='1' AND d.[生产单号] IS NOT NULL AND d.[生产单号]<>''
    GROUP BY d.[生产单号]
) sr ON sr.[生产单号]=h.[生产单号]
LEFT JOIN (
    SELECT d.[生产单号], SUM(d.[数量]) AS [入成品数量]
    FROM [成品入仓明细单] d JOIN [成品入仓单] f ON f.[单号]=d.[单号]
    WHERE ISNULL(f.[审核],'0')='1' AND d.[生产单号] IS NOT NULL AND d.[生产单号]<>''
    GROUP BY d.[生产单号]
) fr ON fr.[生产单号]=h.[生产单号]
WHERE @kw IS NULL OR h.[生产单号] LIKE @kw OR h.[款号] LIKE @kw OR h.[款式] LIKE @kw
   OR h.[客户名称] LIKE @kw OR h.[合同号] LIKE @kw
ORDER BY h.[ID] DESC
OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<ProductionHeaderDto>()).AsList();
        return new PagedResult<ProductionHeaderDto>(items, total);
    }

    // 查询页顶部合计:与 ListAsync 相同的关键字过滤,不分页汇总全部匹配行
    public async Task<ProductionSummaryDto> SummaryAsync(string? keyword)
    {
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        return await c.QuerySingleAsync<ProductionSummaryDto>(@"
SELECT ISNULL(SUM(h.[计划数量]),0) AS [计划数量合计],
       ISNULL(SUM(ISNULL(sr.[入半成品数量],0)),0) AS [入半成品数量合计],
       ISNULL(SUM(ISNULL(fr.[入成品数量],0)),0) AS [入成品数量合计]
FROM [生产制单] h
LEFT JOIN (
    SELECT d.[生产单号], SUM(d.[数量]) AS [入半成品数量]
    FROM [半成品入仓明细单] d JOIN [半成品入仓单] s ON s.[单号]=d.[单号]
    WHERE ISNULL(s.[审核],'0')='1' AND d.[生产单号] IS NOT NULL AND d.[生产单号]<>''
    GROUP BY d.[生产单号]
) sr ON sr.[生产单号]=h.[生产单号]
LEFT JOIN (
    SELECT d.[生产单号], SUM(d.[数量]) AS [入成品数量]
    FROM [成品入仓明细单] d JOIN [成品入仓单] f ON f.[单号]=d.[单号]
    WHERE ISNULL(f.[审核],'0')='1' AND d.[生产单号] IS NOT NULL AND d.[生产单号]<>''
    GROUP BY d.[生产单号]
) fr ON fr.[生产单号]=h.[生产单号]
WHERE @kw IS NULL OR h.[生产单号] LIKE @kw OR h.[款号] LIKE @kw OR h.[款式] LIKE @kw
   OR h.[客户名称] LIKE @kw OR h.[合同号] LIKE @kw;", new { kw });
    }

    // 详情：单头 + 数量 + 工序 + BOM
    public async Task<ProductionDetailDto?> GetAsync(string 生产单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[生产单号],[款号],[款式],[合同号],[客户编号],[客户名称],[客户款号],[加工厂编号],[加工厂名称],
       [日期],[交货日期],[下单日期],[制单人],[跟单员],[计划数量],[接单数量],[工序数],[工序单价],[物料金额],[出货单价],
       [订单类型],[标识],[装箱方式],[订单总箱数],[默认单价],[审核],[审核人],[完成],[备注]
FROM [生产制单] WHERE [生产单号]=@生产单号;
SELECT [ID],[序号],[货号],[BOM款号],[款号名称],[数量],[比例],[分析]
FROM [生产制单货号] WHERE [生产单号]=@生产单号 ORDER BY [序号];
SELECT [ID],[货号],[颜色],[尺码],[数量] FROM [生产制单数量] WHERE [生产单号]=@生产单号 ORDER BY [ID];
SELECT [ID],[货号],[工序号],[工序名称],[单价],[工序类型] FROM [生产制单工序表] WHERE [生产单号]=@生产单号 ORDER BY [货号],[工序号];
SELECT [ID],[货号],[物料编号],[物料名称],[规格],[颜色],[单位],[总数量],[库存数量],[可用库存],[需订数量],
       [预算单价],[金额],[供应商编号],[供应商名称]
FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号 ORDER BY [ID];",
            new { 生产单号 });
        var header = await multi.ReadFirstOrDefaultAsync<ProductionHeaderDto>();
        if (header is null) return null;
        return new ProductionDetailDto
        {
            单头 = header,
            货号明细 = (await multi.ReadAsync<ProductionGoodsRowDto>()).AsList(),
            数量 = (await multi.ReadAsync<ProductionQtyRowDto>()).AsList(),
            工序 = (await multi.ReadAsync<ProductionProcessDto>()).AsList(),
            物料 = (await multi.ReadAsync<ProductionBomDto>()).AsList(),
        };
    }

    // 删除：仅未审核可删；先清订单回写引用 → 删子表 → 删单头
    public async Task<bool> DeleteAsync(string 生产单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的生产制单不能删除，请先反审核。");

        // 清除订单上的关联引用（FK 不允许删被引用的单头）
        await c.ExecuteAsync("UPDATE [成品客户订单总表] SET [生产单号]=NULL WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        await c.ExecuteAsync("UPDATE [成品客户订单明细表] SET [生产单号]=NULL WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        // 删子表（FK→单头）
        await c.ExecuteAsync("DELETE FROM [生产BOM物料清单] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [生产制单工序表] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [生产制单数量] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [生产制单货号] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        // 删单头
        await c.ExecuteAsync("DELETE FROM [生产制单] WHERE [生产单号]=@生产单号", new { 生产单号 }, tx);
        tx.Commit();
        return true;
    }

    // === 算法4 BOM 物料需求展开/缺料 ===
    // 需求(总数量) = 款号物料明细表.使用数量 × 计划数量（半成品行沿层级递归替换展开，用量逐层相乘）
    // 半成品行判定（免加列）：物料编号存在于 半成品共用物料设置.产品货号 即为调入的下级半成品，
    // 该行不直接产生物料需求，而是用其自身 BOM 递归替换展开（环保护+层级上限见 SemiBomExpander）。
    // 库存数量 = 采购入仓(+) + 退料(+) − 领料(−)，只认已审核单（P3 物料侧落地前自然为 0）
    // 需订数量(缺料) = max(0, 总数量 − 库存数量)
    // 预算单价 = 物料资料.单价；金额 = 总数量 × 预算单价；单头.物料金额 = Σ(金额)
    private async Task<decimal> ExpandBomAsync(SqlConnection c, SqlTransaction tx,
        string 生产单号, string 货号, string BOM款号, string? 款号名称,
        string? 客户款号, string? 合同号, decimal 货号数量, DateTime now)
    {
        // 供应商 LEFT JOIN 供应商资料 校验：FK 要求 生产BOM物料清单.供应商编号 必须存在于供应商资料
        var semiSet = new HashSet<string>(
            await c.QueryAsync<string>("SELECT [产品货号] FROM [半成品共用物料设置]", transaction: tx),
            StringComparer.OrdinalIgnoreCase);

        // 逐款号缓存 BOM 行：多层级展开时同一半成品只查一次。
        // 同步查询：展开器为纯同步递归，且此处与外层写操作顺序使用同一连接/事务，无并发冲突。
        var bomCache = new Dictionary<string, List<BomSourceRow>>(StringComparer.OrdinalIgnoreCase);
        List<BomSourceRow> LinesOf(string 款号)
        {
            if (bomCache.TryGetValue(款号, out var cached)) return cached;
            var rows = c.Query<BomSourceRow>(@"
SELECT b.[物料编号], b.[物料名称], b.[物料类别], b.[规格], b.[颜色], b.[单位], b.[使用数量],
       COALESCE(m.[单价], pm.[单价]) AS 预算单价, s.[供应商编号], s.[供应商名称]
FROM [款号物料明细表] b
LEFT JOIN [物料资料] m ON m.[物料编号] = b.[物料编号]
LEFT JOIN [塑胶物料资料] pm ON pm.[物料编号] = b.[物料编号] AND m.[物料编号] IS NULL
LEFT JOIN [供应商资料] s ON s.[供应商编号] = COALESCE(m.[供应商编号], pm.[供应商编号])
WHERE b.[款号]=@款号", new { 款号 }, tx).AsList();
            bomCache[款号] = rows;
            return rows;
        }

        var expansion = SemiBomExpander.Expand(
            BOM款号, LinesOf, b => b.物料编号, b => b.使用数量, semiSet.Contains);
        foreach (var w in expansion.警告)
            log?.LogWarning("生产制单 {生产单号} BOM 展开：{警告}", 生产单号, w);

        decimal 物料金额合计 = 0;
        foreach (var e in expansion.物料)
        {
            var b = e.行;
            var 总数量 = e.累计用量 * 货号数量;
            // 可用库存暂=当前库存(预留/在途扣减逻辑 P3 落地)；
            // N+1 查询此处可接受：制单是一次性写操作,款式物料通常<50行;批量场景再改 IN 批查。
            var 库存数量 = await inventory.StockOfAsync(b.物料编号 ?? "", (c, tx));
            var 需订数量 = Math.Max(0, 总数量 - 库存数量);
            var 金额 = 总数量 * (b.预算单价 ?? 0);
            物料金额合计 += 金额;

            await c.ExecuteAsync(@"
INSERT INTO [生产BOM物料清单]([日期],[制单日期],[生产单号],[货号],[款号],[款式],[客户款号],[合同号],
    [物料编号],[物料名称],[规格],[颜色],[单位],
    [总数量],[库存数量],[可用库存],[需订数量],[订货数量],[预算单价],[金额],
    [供应商编号],[供应商名称],[审核])
VALUES(@日期,@日期,@生产单号,@货号,@款号,@款式,@客户款号,@合同号,
    @物料编号,@物料名称,@规格,@颜色,@单位,
    @总数量,@库存数量,@库存数量,@需订数量,0,@预算单价,@金额,
    @供应商编号,@供应商名称,'0')",
                new
                {
                    日期 = now, 生产单号, 货号, 款号 = BOM款号, 款式 = 款号名称, 客户款号, 合同号,
                    b.物料编号, b.物料名称, b.规格, b.颜色, b.单位,
                    总数量, 库存数量, 需订数量, b.预算单价, 金额, b.供应商编号, b.供应商名称
                }, tx);
        }

        return 物料金额合计;
    }

    // 从订单生成：把 生产单号 回写到订单总表/明细表（FK: 订单表.生产单号 → 生产制单.生产单号，单头已插所以安全）
    private static async Task LinkOrderAsync(
        SqlConnection c, SqlTransaction tx, string 生产单号, string? 订单单号)
    {
        if (string.IsNullOrWhiteSpace(订单单号)) return;
        var n = await c.ExecuteAsync(
            "UPDATE [成品客户订单总表] SET [生产单号]=@生产单号 WHERE [单号]=@订单单号",
            new { 生产单号, 订单单号 }, tx);
        if (n == 0) throw new ArgumentException($"订单 [{订单单号}] 不存在，无法关联生产制单。");
        await c.ExecuteAsync(
            "UPDATE [成品客户订单明细表] SET [生产单号]=@生产单号 WHERE [单号]=@订单单号",
            new { 生产单号, 订单单号 }, tx);
    }
}
