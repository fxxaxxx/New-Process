using Dapper;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Sales;

// 应收对账（算法5）：应收余额 = 出货 − 收款 − 退货，按客户。JOIN 各单头按 审核='1' 过滤。只读。
public sealed class ReceivablesService(ISqlConnectionFactory factory)
{
    private const string Sql = @"
SELECT 客户编号, MAX(客户名称) AS 客户名称,
       SUM(CASE WHEN 类型='出货' THEN 金额 ELSE 0 END) AS 出货金额,
       SUM(CASE WHEN 类型='收款' THEN 金额 ELSE 0 END) AS 收款金额,
       SUM(CASE WHEN 类型='退货' THEN 金额 ELSE 0 END) AS 退货金额,
       SUM(CASE WHEN 类型='出货' THEN 金额 WHEN 类型='收款' THEN -金额 WHEN 类型='退货' THEN -金额 ELSE 0 END) AS 应收余额
FROM (
    SELECT d.客户编号, d.客户名称, '出货' AS 类型, ISNULL(d.金额,0) AS 金额
      FROM [销售出货明细单] d JOIN [销售出货单] h ON h.单号=d.单号 WHERE ISNULL(h.审核,'0')='1'
    UNION ALL
    SELECT d.客户编号, d.客户名称, '退货', ISNULL(d.金额,0)
      FROM [销售退货明细单] d JOIN [销售退货单] h ON h.单号=d.单号 WHERE ISNULL(h.审核,'0')='1'
    UNION ALL
    SELECT d.客户编号, d.客户名称, '收款', ISNULL(d.收款金额,0)
      FROM [销售收款明细单] d JOIN [销售收款单] h ON h.单号=d.单号 WHERE ISNULL(h.审核,'0')='1'
) t
WHERE @客户编号 IS NULL OR 客户编号=@客户编号
GROUP BY 客户编号
ORDER BY 客户编号;";

    public async Task<IReadOnlyList<ReceivableRow>> ListAsync(string? 客户编号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<ReceivableRow>(Sql, new { 客户编号 = string.IsNullOrWhiteSpace(客户编号) ? null : 客户编号.Trim() });
        return rows.AsList();
    }
}
