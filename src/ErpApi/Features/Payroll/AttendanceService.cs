using Dapper;
using ErpApi.Infrastructure.Db;
namespace ErpApi.Features.Payroll;

// 月度出勤汇总：实出勤天数 = 应出勤天数(入参) − 缺勤天数(Σ缺勤登记.计算出勤,当月)。列出在职员工。只读。
// 注：b缺勤登记明细.[计算出勤] 为 nvarchar(6)（字符串），故用 TRY_CONVERT(decimal) 安全求和（空串/非数字→NULL，不报错）。
public sealed class AttendanceService(ISqlConnectionFactory factory)
{
    private const string Sql = @"
SELECT b.[编号] AS 工号, MAX(b.[姓名]) AS 姓名, b.[部门编号], MAX(d.[部门]) AS 部门,
       @应出勤天数 AS 应出勤天数,
       ISNULL(SUM(TRY_CONVERT(decimal(18,4), q.[计算出勤])),0) AS 缺勤天数,
       @应出勤天数 - ISNULL(SUM(TRY_CONVERT(decimal(18,4), q.[计算出勤])),0) AS 实出勤天数
FROM [人事档案] b
LEFT JOIN [b缺勤登记明细] q ON q.[工号]=b.[编号] AND q.[日期] >= @月初 AND q.[日期] < @下月初
LEFT JOIN [部门信息] d ON d.[编号]=b.[部门编号]
WHERE ISNULL(b.[在职],'1')='1' AND (@部门编号 IS NULL OR b.[部门编号]=@部门编号)
GROUP BY b.[编号], b.[部门编号]
ORDER BY b.[部门编号], b.[编号];";

    public async Task<IReadOnlyList<AttendanceMonthlyRow>> MonthlyAsync(string 月份, decimal 应出勤天数, string? 部门编号)
    {
        if (string.IsNullOrWhiteSpace(月份) || 月份.Length != 6 || !int.TryParse(月份, out _))
            throw new System.ArgumentException("月份须为 6 位 yyyyMM。");
        var y = int.Parse(月份[..4]); var m = int.Parse(月份[4..]);
        if (m < 1 || m > 12) throw new System.ArgumentException("月份的月份段须在 01–12 之间。");
        var 月初 = new System.DateTime(y, m, 1); var 下月初 = 月初.AddMonths(1);
        using var c = factory.Create();
        var rows = await c.QueryAsync<AttendanceMonthlyRow>(Sql,
            new { 月初, 下月初, 应出勤天数, 部门编号 = string.IsNullOrWhiteSpace(部门编号) ? null : 部门编号.Trim() });
        return rows.AsList();
    }
}
