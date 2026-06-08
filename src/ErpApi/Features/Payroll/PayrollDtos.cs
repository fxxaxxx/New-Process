namespace ErpApi.Features.Payroll;

public sealed class PieceworkPayrollRow
{
    public string? 编号 { get; set; }
    public string? 姓名 { get; set; }
    public string? 部门编号 { get; set; }
    public string? 部门 { get; set; }
    public decimal 数量 { get; set; }
    public decimal? 计件工资 { get; set; }
}
