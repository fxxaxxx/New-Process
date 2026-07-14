using Dapper;
using ErpApi.Features.MasterData;
using ErpApi.Infrastructure.Db;

namespace ErpApi.Features.Warehouse.Semi.CommonMaterials;

public sealed class SemiFinishedCommonMaterialService(ISqlConnectionFactory factory)
{
    public async Task<PagedResult<SemiFinishedCommonMaterialRow>> ListAsync(
        SemiFinishedCommonMaterialQuery query,
        bool canSeePrice)
    {
        var page = Math.Max(query.Page, 1);
        var size = Math.Clamp(query.Size, 1, 200);
        var keyword = string.IsNullOrWhiteSpace(query.Keyword) ? null : query.Keyword.Trim();
        var match = query.精确 || keyword is null ? keyword : $"%{keyword}%";
        var fieldSql = query.查询字段 switch
        {
            "产品名称" => "b.[产品名称]",
            "产品装配名称" => "b.[产品装配名称]",
            "配件编号" => "b.[配件编号]",
            "共用物料编号" => "b.[共用物料编号]",
            "客户" => "b.[客户]",
            _ => "b.[产品货号]"
        };

        var cte = $@"
WITH LatestHeader AS (
    SELECT h.*,
           ROW_NUMBER() OVER (PARTITION BY h.[款号] ORDER BY h.[ID] DESC) AS rn
    FROM [款号物料总表] h
    WHERE NULLIF(LTRIM(RTRIM(h.[款号])), N'') IS NOT NULL
),
DetailFallback AS (
    SELECT d.[款号],
           MAX(NULLIF(LTRIM(RTRIM(d.[客户名称])), N'')) AS [客户名称],
           MAX(NULLIF(LTRIM(RTRIM(d.[客户])), N'')) AS [客户],
           MAX(NULLIF(LTRIM(RTRIM(d.[款式])), N'')) AS [款式]
    FROM [款号物料明细表] d
    GROUP BY d.[款号]
),
Base AS (
    SELECT h.[款号] AS [产品货号],
           COALESCE(NULLIF(LTRIM(RTRIM(h.[客户名称])), N''),
                    NULLIF(LTRIM(RTRIM(h.[客户])), N''), d.[客户名称], d.[客户]) AS [客户],
           COALESCE(NULLIF(LTRIM(RTRIM(h.[款式])), N''), d.[款式]) AS [产品名称],
           COALESCE(NULLIF(LTRIM(RTRIM(s.[产品装配名称])), N''),
                    NULLIF(LTRIM(RTRIM(h.[款式])), N''), d.[款式]) AS [产品装配名称],
           s.[库存单价HK] AS [库存单价],
           COALESCE(NULLIF(LTRIM(RTRIM(s.[配件编号])), N''), h.[产品编号]) AS [配件编号],
           s.[共用物料编号],
           CASE WHEN ISNULL(s.[调整审核], 0) = 1 THEN N'已审核' ELSE N'未审核' END AS [调整审核],
           COALESCE(NULLIF(LTRIM(RTRIM(s.[备注内容])), N''), h.[备注]) AS [备注内容]
    FROM LatestHeader h
    LEFT JOIN [半成品共用物料设置] s ON s.[产品货号] = h.[款号]
    LEFT JOIN DetailFallback d ON d.[款号] = h.[款号]
    WHERE h.rn = 1
),
Numbered AS (
    SELECT b.*,
           COUNT(*) OVER (PARTITION BY NULLIF(LTRIM(RTRIM([共用物料编号])), N'')) AS DuplicateCount
    FROM Base b
),
Filtered AS (
    SELECT b.*
    FROM Numbered b
    WHERE (@showDuplicates = 0 OR (
              NULLIF(LTRIM(RTRIM(b.[共用物料编号])), N'') IS NOT NULL
              AND b.DuplicateCount >= 2))
      AND (@pendingMode = 0
           OR (@pendingMode = 1 AND NULLIF(LTRIM(RTRIM(b.[共用物料编号])), N'') IS NULL)
           OR (@pendingMode = 2 AND NULLIF(LTRIM(RTRIM(b.[共用物料编号])), N'') IS NOT NULL))
      AND (@auditMode = 0
           OR (@auditMode = 1 AND b.[调整审核] = N'未审核')
           OR (@auditMode = 2 AND b.[调整审核] = N'已审核'))
      AND (@keyword IS NULL OR {fieldSql} LIKE @match)
)";

        var sql = $@"
{cte}
SELECT COUNT(*) FROM Filtered;
{cte}
SELECT [产品货号], [客户], [产品名称], [产品装配名称], [库存单价],
       [配件编号], [共用物料编号], [调整审核], [备注内容]
FROM Filtered
ORDER BY [产品货号]
OFFSET (@page - 1) * @size ROWS FETCH NEXT @size ROWS ONLY;";

        var parameters = new
        {
            showDuplicates = query.重复内容 == "显示重复" ? 1 : 0,
            pendingMode = query.待操作物料 switch { "待设置" => 1, "已设置" => 2, _ => 0 },
            auditMode = query.审核情况 switch { "未审核" => 1, "已审核" => 2, _ => 0 },
            keyword,
            match,
            page,
            size
        };

        await using var connection = factory.Create();
        await connection.OpenAsync();
        using var multi = await connection.QueryMultipleAsync(sql, parameters);
        var total = await multi.ReadFirstAsync<int>();
        var items = (await multi.ReadAsync<SemiFinishedCommonMaterialRow>()).AsList();

        if (!canSeePrice)
            foreach (var row in items)
                row.库存单价 = null;

        return new PagedResult<SemiFinishedCommonMaterialRow>(items, total);
    }
}
