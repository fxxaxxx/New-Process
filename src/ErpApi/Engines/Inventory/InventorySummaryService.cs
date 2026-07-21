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

    // 半成品口径：入仓(+)、领料(-)、盘点盈亏(±)，按 物料编号×颜色 group，仅审核'1'。
    // 注意：半成品各明细单无 审核 列（与成品不同），审核状态在主单上，故 JOIN 主单按 单号 取 审核。
    // 盘点 系统/盘点/盈亏数量列为 real，CAST 对齐 decimal。
    private const string SemiSql = @"
SELECT 物料编号, MAX(物料名称) AS 物料名称, MAX(规格) AS 规格, 颜色, SUM(库存) AS 库存
FROM (
    SELECT d.物料编号,d.物料名称,d.规格,d.颜色, d.数量        AS 库存
      FROM [半成品入仓明细单] d JOIN [半成品入仓单] h ON h.单号=d.单号
      WHERE d.仓库=@仓 AND ISNULL(h.审核,'0')='1'
    UNION ALL
      SELECT d.物料编号,d.物料名称,d.规格,d.颜色, d.数量*-1     AS 库存
        FROM [半成品退仓明细单] d JOIN [半成品退仓单] h ON h.单号=d.单号
        WHERE d.仓库=@仓 AND ISNULL(h.审核,'0')='1'
      UNION ALL
      SELECT d.物料编号,d.物料名称,d.规格,d.颜色, d.数量*-1     AS 库存
        FROM [半成品领料明细单] d JOIN [半成品领料单] h ON h.单号=d.单号
      WHERE d.仓库=@仓 AND ISNULL(h.审核,'0')='1'
    UNION ALL
    SELECT d.物料编号,d.物料名称,d.规格,d.颜色, CAST(d.盈亏数量 AS decimal(18,4)) AS 库存
      FROM [半成品盘点明细单] d JOIN [半成品盘点单] h ON h.单号=d.单号
      WHERE d.仓库=@仓 AND ISNULL(h.审核,'0')='1'
    UNION ALL
    SELECT d.物料编号,d.物料名称,d.规格,d.颜色, d.数量        AS 库存
      FROM [半成品退库明细单] d JOIN [半成品退库单] h ON h.单号=d.单号
      WHERE d.仓库=@仓 AND ISNULL(h.审核,'0')='1'
    UNION ALL
    SELECT d.物料编号,d.物料名称,d.规格,d.颜色, d.数量*-1     AS 库存
      FROM [半成品报废明细单] d JOIN [半成品报废单] h ON h.单号=d.单号
      WHERE d.仓库=@仓 AND ISNULL(h.审核,'0')='1'
) t
GROUP BY 物料编号, 颜色
HAVING SUM(库存) <> 0;";

    public async Task<IReadOnlyList<SemiFinishedRow>> SemiFinishedAsync(string warehouse)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<SemiFinishedRow>(SemiSql, new { 仓 = warehouse });
        return rows.AsList();
    }
}
