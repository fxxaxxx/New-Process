using Dapper;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Materials.MaterialMaster;

// 物料资料左树 + 右表的只读查询。增删改复用 MaterialController(/api/master/materials)。
public sealed class MaterialMasterService(ISqlConnectionFactory factory)
{
    // 左树：物料上实际出现的非空分类 + 该类物料数
    public async Task<IReadOnlyList<MaterialCategoryNode>> CategoriesAsync()
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<MaterialCategoryNode>(@"
SELECT [物料类别] AS 类别, COUNT(*) AS 数量
FROM [物料资料]
WHERE [物料类别] IS NOT NULL AND LTRIM(RTRIM([物料类别])) <> ''
GROUP BY [物料类别]
ORDER BY [物料类别];");
        return rows.AsList();
    }

    // 右表：按精确分类(@类别 空=不过滤) + 关键字 过滤的分页
    public async Task<PagedResult<MaterialRow>> ListAsync(string? 类别, string? keyword, int page, int size, bool onlyStock = false)
    {
        if (page < 1) page = 1;
        if (size < 1 || size > 200) size = 20;
        var cat = string.IsNullOrWhiteSpace(类别) ? null : 类别.Trim();
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        using var multi = await c.QueryMultipleAsync(@"
SELECT COUNT(*) FROM [物料资料]
WHERE (@cat IS NULL OR [物料类别] = @cat)
  AND (@kw IS NULL OR [物料编号] LIKE @kw OR [物料名称] LIKE @kw OR [规格] LIKE @kw OR [颜色] LIKE @kw OR [供应商名称] LIKE @kw OR [仓库位置] LIKE @kw)
  AND (@onlyStock = 0 OR ISNULL([库存],0) > 0);
SELECT [ID],[物料类别],[物料编号],[物料名称],[规格],[颜色],[单位],[单价],[销售价],[库存],[最低库存],[最高库存],[供应商编号],[供应商名称],[备注],[仓库位置],[码换算]
FROM [物料资料]
WHERE (@cat IS NULL OR [物料类别] = @cat)
  AND (@kw IS NULL OR [物料编号] LIKE @kw OR [物料名称] LIKE @kw OR [规格] LIKE @kw OR [颜色] LIKE @kw OR [供应商名称] LIKE @kw OR [仓库位置] LIKE @kw)
  AND (@onlyStock = 0 OR ISNULL([库存],0) > 0)
ORDER BY [物料编号] OFFSET (@page-1)*@size ROWS FETCH NEXT @size ROWS ONLY;",
            new { cat, kw, page, size, onlyStock = onlyStock ? 1 : 0 });
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<MaterialRow>()).AsList();
        return new PagedResult<MaterialRow>(items, total);
    }

    public async Task<IReadOnlyList<AuxiliaryPurchaseAnalysisRow>> AuxiliaryPurchaseAnalysisAsync(
        string? 物料类别,
        string? keyword,
        bool onlyBuy)
    {
        var cat = string.IsNullOrWhiteSpace(物料类别) ? null : 物料类别.Trim();
        var kw = string.IsNullOrWhiteSpace(keyword) ? null : $"%{keyword.Trim()}%";
        using var c = factory.Create();
        var rows = await c.QueryAsync<AuxiliaryPurchaseAnalysisRow>(@"
WITH 在途 AS (
    SELECT d.[物料编号],
           SUM(CASE WHEN ISNULL(d.[数量],0) - ISNULL(rk.[入仓数量],0) > 0
                    THEN ISNULL(d.[数量],0) - ISNULL(rk.[入仓数量],0)
                    ELSE 0 END) AS 在途数量,
           MAX(o.[供应商名称]) AS 供应商名称
    FROM [采购明细单] d
    JOIN [采购订单] o ON o.[单号] = d.[单号]
    LEFT JOIN (
        SELECT r.[订单单号], r.[物料编号], ISNULL(r.[颜色], N'') AS 颜色键, SUM(ISNULL(r.[数量],0)) AS 入仓数量
        FROM [采购入仓明细单] r
        JOIN [采购入仓单] h ON h.[单号] = r.[单号]
        WHERE ISNULL(h.[审核], '0') = '1'
        GROUP BY r.[订单单号], r.[物料编号], ISNULL(r.[颜色], N'')
    ) rk ON rk.[订单单号] = d.[单号]
        AND rk.[物料编号] = d.[物料编号]
        AND rk.[颜色键] = ISNULL(d.[颜色], N'')
    WHERE ISNULL(o.[审核], '0') = '1'
    GROUP BY d.[物料编号]
),
需领 AS (
    SELECT d.[物料编号],
           SUM(COALESCE(mo.[接单数量], h.[使用数量], 0) * ISNULL(d.[使用数量], 0)) AS 需领数量
    FROM [款号物料总表] h
    JOIN [款号物料明细表] d ON d.[款号] = h.[款号]
    OUTER APPLY (
        SELECT TOP 1 [接单数量]
        FROM [生产通知单MO单] mo
        WHERE mo.[产品货号] = h.[款号]
        ORDER BY mo.[接单日期] DESC, mo.[ID] DESC
    ) mo
    WHERE ISNULL(h.[审核], '0') = '1'
    GROUP BY d.[物料编号]
),
src AS (
    SELECT m.[物料编号] AS 辅料编号,
           MAX(m.[物料名称]) AS 辅料名称,
           MAX(m.[规格]) AS 规格,
           MAX(m.[单位]) AS 单位,
           MAX(ISNULL(m.[库存], 0)) AS 库存数量,
           MAX(ISNULL(t.[在途数量], 0)) AS 在途数量,
           MAX(ISNULL(n.[需领数量], 0)) AS 需领数量,
           MAX(ISNULL(m.[库存], 0)) + MAX(ISNULL(t.[在途数量], 0)) - MAX(ISNULL(n.[需领数量], 0)) AS 可用库存,
           CASE WHEN MAX(ISNULL(n.[需领数量], 0)) - MAX(ISNULL(m.[库存], 0)) - MAX(ISNULL(t.[在途数量], 0)) > 0
                THEN MAX(ISNULL(n.[需领数量], 0)) - MAX(ISNULL(m.[库存], 0)) - MAX(ISNULL(t.[在途数量], 0))
                ELSE 0 END AS 订货数量,
           COALESCE(NULLIF(MAX(m.[供应商名称]), N''), MAX(t.[供应商名称])) AS 供应商
    FROM [物料资料] m
    LEFT JOIN 在途 t ON t.[物料编号] = m.[物料编号]
    LEFT JOIN 需领 n ON n.[物料编号] = m.[物料编号]
    WHERE (@cat IS NULL OR m.[物料类别] = @cat)
      AND (@kw IS NULL OR m.[物料编号] LIKE @kw OR m.[物料名称] LIKE @kw OR m.[规格] LIKE @kw OR m.[供应商名称] LIKE @kw)
    GROUP BY m.[物料编号]
)
SELECT [辅料编号], [辅料名称], [规格], [单位], [库存数量], [在途数量], [需领数量], [可用库存], [订货数量], [供应商]
FROM src
WHERE (@onlyBuy = 0 OR [订货数量] > 0)
ORDER BY [辅料编号];", new { cat, kw, onlyBuy = onlyBuy ? 1 : 0 });
        return rows.AsList();
    }
}
