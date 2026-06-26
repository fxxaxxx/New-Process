using Dapper;
using ErpApi.Engines.DocumentNumber;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Plastics.PlasticMaterialDoc;

// 塑胶物料单。两层:塑胶物料单(头) + 塑胶物料明细单(明细)。
// basis 来源:塑胶共用物料表 JOIN 生产制单货号 ON 货号=塑胶货号;仓位号 LEFT JOIN 塑胶物料资料。
// 审核/反审核由通用过账引擎处理(仅翻头表审核位)。
public sealed class PlasticMaterialDocService(ISqlConnectionFactory factory, IDocumentNumberGenerator docNo)
{
    public const string DocType = "塑胶物料单";
    public const string Prefix = "SL";   // 单号 = SL + yyyyMMdd + 3位流水

    // 塑胶采购分析:列生产单(按 生产制单.日期 区间 + 关键词)。
    public async Task<PagedResult<PlasticOrderRow>> OrdersAsync(DateTime? 起, DateTime? 止, string? keyword, int page, int size)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var 止Excl = 止?.Date.AddDays(1);
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [生产制单]
WHERE (@起 IS NULL OR [日期] >= @起) AND (@止 IS NULL OR [日期] < @止)
  AND (@kw IS NULL OR [生产单号] LIKE @kw OR [款号] LIKE @kw OR [款式] LIKE @kw OR [客户名称] LIKE @kw OR [合同号] LIKE @kw);
SELECT [ID],[生产单号],[款号],[款式],[合同号],[客户名称],[计划数量],[日期],[交货日期],[审核]
FROM [生产制单]
WHERE (@起 IS NULL OR [日期] >= @起) AND (@止 IS NULL OR [日期] < @止)
  AND (@kw IS NULL OR [生产单号] LIKE @kw OR [款号] LIKE @kw OR [款式] LIKE @kw OR [客户名称] LIKE @kw OR [合同号] LIKE @kw)
ORDER BY [ID] DESC OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { 起, 止 = 止Excl, kw, page, size });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<PlasticOrderRow>()).AsList();
        return new PagedResult<PlasticOrderRow>(items, total);
    }

    // 按生产单货号从塑胶共用物料表带出塑胶用料(仓位号 LEFT JOIN 塑胶物料资料)。
    public async Task<IReadOnlyList<PlasticMaterialBasisRow>> BasisAsync(string 生产单号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticMaterialBasisRow>(@"
SELECT g.[货号], p.[工模编号], p.[物料编号], p.[物料名称], p.[颜色],
       m.[仓位号], p.[用料名称], p.[加工内容], p.[加工单价], p.[用量]
FROM [塑胶共用物料表] p
JOIN [生产制单货号] g ON g.[货号] = p.[塑胶货号]
LEFT JOIN (SELECT [物料编号], MAX([仓位号]) AS 仓位号 FROM [塑胶物料资料] GROUP BY [物料编号]) m
       ON m.[物料编号] = p.[物料编号]
WHERE g.[生产单号] = @生产单号
ORDER BY p.[ID]", new { 生产单号 });
        return rows.AsList();
    }

    // 保存成单:生成 SL 单号,插头(数量/金额合计)+ 逐行插明细(金额=订购数量×加工单价)。
    public async Task<string> CreateAsync(PlasticMaterialDocCreateDto dto, string user)
    {
        if (dto.明细.Count == 0) throw new ArgumentException("塑胶物料单至少要有一行明细");
        var 数量合计 = dto.明细.Sum(l => l.订购数量);
        var 金额合计 = dto.明细.Sum(l => l.订购数量 * (l.加工单价 ?? 0));
        var now = DateTime.Now;

        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 单号 = await docNo.NextAsync(DocType, Prefix, now, c, tx);

        await c.ExecuteAsync(@"
INSERT INTO [塑胶物料单]([单号],[日期],[生产单号],[货号],[客户],[数量],[金额],[操作员],[审核],[备注])
VALUES(@单号,@日期,@生产单号,@货号,@客户,@数量,@金额,@操作员,'0',@备注)",
            new { 单号, 日期 = now, dto.生产单号, dto.货号, dto.客户,
                  数量 = 数量合计, 金额 = 金额合计, 操作员 = user, dto.备注 }, tx);

        foreach (var l in dto.明细)
            await c.ExecuteAsync(@"
INSERT INTO [塑胶物料明细单]([单号],[生产单号],[货号],[工模编号],[物料编号],[物料名称],[颜色],[仓位号],[用料名称],[加工内容],[加工单价],[用量],[订购数量],[金额])
VALUES(@单号,@生产单号,@货号,@工模编号,@物料编号,@物料名称,@颜色,@仓位号,@用料名称,@加工内容,@加工单价,@用量,@订购数量,@金额)",
                new { 单号, dto.生产单号, dto.货号, l.工模编号, l.物料编号, l.物料名称, l.颜色, l.仓位号,
                      l.用料名称, l.加工内容, l.加工单价, l.用量, l.订购数量, 金额 = l.订购数量 * (l.加工单价 ?? 0) }, tx);

        tx.Commit();
        return 单号;
    }

    public async Task<PlasticMaterialDocDetailDto?> GetAsync(string 单号)
    {
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT [ID],[单号],[日期],[生产单号],[货号],[客户],[数量],[金额],[操作员],[审核],[审核人],[备注]
FROM [塑胶物料单] WHERE [单号]=@单号;
SELECT [ID],[工模编号],[物料编号],[物料名称],[颜色],[仓位号],[用料名称],[加工内容],[加工单价],[用量],[订购数量],[金额],[备注]
FROM [塑胶物料明细单] WHERE [单号]=@单号 ORDER BY [ID];", new { 单号 });
        var header = await multi.ReadFirstOrDefaultAsync<PlasticMaterialDocHeaderDto>();
        if (header is null) return null;
        var lines = (await multi.ReadAsync<PlasticMaterialDocLineDto>()).AsList();
        return new PlasticMaterialDocDetailDto { 单头 = header, 明细 = lines };
    }

    // 塑胶类型客户统计:按 客户 × 加工内容(=塑胶类型) 汇总 订购数量/金额(仅审核='1' + 单据日期区间)。
    public async Task<IReadOnlyList<PlasticCustomerTypeStatRow>> CustomerTypeStatsAsync(DateTime 起, DateTime 止, string? 客户)
    {
        var qi = 起.Date;
        var qe = 止.Date.AddDays(1);
        var ck = string.IsNullOrWhiteSpace(客户) ? null : $"%{客户.Trim()}%";
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticCustomerTypeStatRow>(@"
SELECT h.[客户] AS 客户, ISNULL(NULLIF(LTRIM(RTRIM(d.[加工内容])), N''), N'未分类') AS 类型,
       SUM(ISNULL(d.[订购数量],0)) AS 数量, SUM(ISNULL(d.[金额],0)) AS 金额
FROM [塑胶物料明细单] d JOIN [塑胶物料单] h ON h.[单号]=d.[单号]
WHERE ISNULL(h.[审核],'0')='1' AND h.[日期] >= @qi AND h.[日期] < @qe
  AND (@ck IS NULL OR h.[客户] LIKE @ck)
GROUP BY h.[客户], ISNULL(NULLIF(LTRIM(RTRIM(d.[加工内容])), N''), N'未分类')
HAVING SUM(ISNULL(d.[订购数量],0)) <> 0 OR SUM(ISNULL(d.[金额],0)) <> 0
ORDER BY h.[客户], 类型", new { qi, qe, ck });
        return rows.AsList();
    }

    // 塑胶分析明细查询:塑胶物料明细 JOIN 单头(日期) + LEFT JOIN 生产制单(款号/完成) + LEFT JOIN 塑胶物料资料(材料/单位)。
    public async Task<IReadOnlyList<PlasticAnalysisDetailRow>> AnalysisDetailAsync(DateTime 起, DateTime 止, string? keyword, string? 完成)
    {
        var qi = 起.Date; var qe = 止.Date.AddDays(1);
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        var done = string.IsNullOrWhiteSpace(完成) ? null : 完成.Trim();
        using var c = factory.Create();
        var rows = await c.QueryAsync<PlasticAnalysisDetailRow>(@"
SELECT h.[日期], d.[生产单号], p.[款号], d.[货号], d.[物料编号], d.[物料名称], d.[颜色],
       m.[物料类别] AS 材料, m.[单位], d.[加工内容], d.[订购数量] AS 数量,
       d.[加工单价], d.[金额], ISNULL(p.[完成], N'否') AS 完成
FROM [塑胶物料明细单] d
JOIN [塑胶物料单] h ON h.[单号] = d.[单号]
LEFT JOIN [生产制单] p ON p.[生产单号] = d.[生产单号]
LEFT JOIN (SELECT [物料编号], MAX([物料类别]) AS 物料类别, MAX([单位]) AS 单位
           FROM [塑胶物料资料] GROUP BY [物料编号]) m ON m.[物料编号] = d.[物料编号]
WHERE h.[日期] >= @qi AND h.[日期] < @qe
  AND (@kw IS NULL OR d.[生产单号] LIKE @kw OR p.[款号] LIKE @kw OR d.[货号] LIKE @kw OR d.[物料编号] LIKE @kw OR d.[物料名称] LIKE @kw)
  AND (@done IS NULL OR ISNULL(p.[完成], N'否') = @done)
ORDER BY h.[日期] DESC, d.[单号], d.[ID]", new { qi, qe, kw, done });
        return rows.AsList();
    }

    // 删除:仅未审核可删;FK 顺序 明细→头。
    public async Task<bool> DeleteAsync(string 单号)
    {
        using var c = factory.Create();
        await c.OpenAsync();
        using var tx = c.BeginTransaction();
        var 审核 = await c.ExecuteScalarAsync<string?>(
            "SELECT ISNULL([审核],'0') FROM [塑胶物料单] WITH (UPDLOCK, HOLDLOCK) WHERE [单号]=@单号", new { 单号 }, tx);
        if (审核 is null) return false;
        if (审核 == "1") throw new InvalidOperationException("已审核的塑胶物料单不能删除，请先反审核。");
        await c.ExecuteAsync("DELETE FROM [塑胶物料明细单] WHERE [单号]=@单号", new { 单号 }, tx);
        await c.ExecuteAsync("DELETE FROM [塑胶物料单] WHERE [单号]=@单号", new { 单号 }, tx);
        tx.Commit();
        return true;
    }
}
