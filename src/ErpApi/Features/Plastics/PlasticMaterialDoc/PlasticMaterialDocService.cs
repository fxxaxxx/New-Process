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
}
