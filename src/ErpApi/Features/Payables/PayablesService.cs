using Dapper;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Payables;

// 应付对账(算法5 AP)：供应商=采购入仓−采购付款；加工厂=发外回收−发外付款。各 JOIN/过滤 审核='1'。只读。
public sealed class PayablesService(ISqlConnectionFactory factory)
{
    private const string SupplierSql = @"
SELECT 供应商编号, MAX(供应商名称) AS 供应商名称,
       SUM(CASE WHEN 类型='入仓' THEN 金额 ELSE 0 END) AS 入仓金额,
       SUM(CASE WHEN 类型='付款' THEN 金额 ELSE 0 END) AS 付款金额,
       SUM(CASE WHEN 类型='入仓' THEN 金额 WHEN 类型='付款' THEN -金额 ELSE 0 END) AS 应付余额
FROM (
    SELECT 供应商编号, 供应商名称, '入仓' AS 类型, ISNULL(金额,0) AS 金额
      FROM [采购入仓单] WHERE ISNULL(审核,'0')='1'
    UNION ALL
    SELECT d.供应商编号, d.供应商名称, '付款', ISNULL(d.付款金额,0)
      FROM [采购付款明细单] d JOIN [采购付款单] h ON h.单号=d.单号 WHERE ISNULL(h.审核,'0')='1'
) t WHERE @供应商编号 IS NULL OR 供应商编号=@供应商编号
GROUP BY 供应商编号 ORDER BY 供应商编号;";

    private const string FactorySql = @"
SELECT 加工厂编号, MAX(加工厂名称) AS 加工厂名称,
       SUM(CASE WHEN 类型='回收' THEN 金额 ELSE 0 END) AS 回收金额,
       SUM(CASE WHEN 类型='付款' THEN 金额 ELSE 0 END) AS 付款金额,
       SUM(CASE WHEN 类型='回收' THEN 金额 WHEN 类型='付款' THEN -金额 ELSE 0 END) AS 应付余额
FROM (
    SELECT 加工厂编号, 加工厂名称, '回收' AS 类型, ISNULL(金额,0) AS 金额
      FROM [发外回收明细单] WHERE ISNULL(审核,'0')='1'
    UNION ALL
    SELECT d.加工厂编号, d.加工厂名称, '付款', ISNULL(d.付款金额,0)
      FROM [发外加工付款明细单] d JOIN [发外加工付款单] h ON h.单号=d.单号 WHERE ISNULL(h.审核,'0')='1'
) t WHERE @加工厂编号 IS NULL OR 加工厂编号=@加工厂编号
GROUP BY 加工厂编号 ORDER BY 加工厂编号;";

    public async Task<IReadOnlyList<PayableSupplierRow>> SupplierAsync(string? 供应商编号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PayableSupplierRow>(SupplierSql, new { 供应商编号 = string.IsNullOrWhiteSpace(供应商编号) ? null : 供应商编号.Trim() });
        return rows.AsList();
    }
    public async Task<IReadOnlyList<PayableFactoryRow>> FactoryAsync(string? 加工厂编号)
    {
        using var c = factory.Create();
        var rows = await c.QueryAsync<PayableFactoryRow>(FactorySql, new { 加工厂编号 = string.IsNullOrWhiteSpace(加工厂编号) ? null : 加工厂编号.Trim() });
        return rows.AsList();
    }
}
