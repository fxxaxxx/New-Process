using Dapper;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Engines.Inventory;

public sealed class InventorySummaryService(ISqlConnectionFactory factory) : IInventorySummaryService
{
    // 算法1：入 +数量 / 出 −数量，UNION ALL 后按 款号×色号×颜色×尺码 group sum，仅 审核='1'。
    // 成品口径：入仓(+)、退货(+客户退回)、出仓(-)、退仓(-)、盘点盈亏(±)、调拨(调入+/调出-)。
    private const string Sql = @"
SELECT 款号, MAX(款式) AS 款式, 色号, 颜色, 尺码, SUM(库存) AS 库存
FROM (
    SELECT 款号,款式,色号,颜色,尺码, 数量        AS 库存 FROM [成品入仓明细单] WHERE 仓库=@仓 AND ISNULL(审核,'0')='1'
    UNION ALL
    SELECT 款号,款式,色号,颜色,尺码, 数量        AS 库存 FROM [成品退货明细单] WHERE 仓库=@仓 AND ISNULL(审核,'0')='1'
    UNION ALL
    SELECT 款号,款式,色号,颜色,尺码, 数量*-1     AS 库存 FROM [成品出仓明细单] WHERE 仓库=@仓 AND ISNULL(审核,'0')='1'
    UNION ALL
    SELECT 款号,款式,色号,颜色,尺码, 数量*-1     AS 库存 FROM [成品退仓明细单] WHERE 仓库=@仓 AND ISNULL(审核,'0')='1'
    UNION ALL
    SELECT 款号,款式,色号,颜色,尺码, 盈亏数量     AS 库存 FROM [成品盘点明细单] WHERE 仓库=@仓 AND ISNULL(审核,'0')='1'
    UNION ALL
    SELECT 款号,款式,色号,颜色,尺码, 数量        AS 库存 FROM [成品调拨明细单] WHERE 目标仓库=@仓 AND ISNULL(审核,'0')='1'
    UNION ALL
    SELECT 款号,款式,色号,颜色,尺码, 数量*-1     AS 库存 FROM [成品调拨明细单] WHERE 源仓库=@仓 AND ISNULL(审核,'0')='1'
) t
GROUP BY 款号,色号,颜色,尺码
HAVING SUM(库存) <> 0;";

    public async Task<IReadOnlyList<InventoryRow>> FinishedGoodsAsync(string warehouse)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<InventoryRow>(Sql, new { 仓 = warehouse });
        return rows.AsList();
    }
}
