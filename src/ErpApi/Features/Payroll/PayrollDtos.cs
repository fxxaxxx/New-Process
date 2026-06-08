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

// ---- 缺勤登记 ----
public sealed class AbsenceCreateDto
{
    public string 工号 { get; set; } = "";
    public string? 姓名 { get; set; }
    public string? 部门 { get; set; }
    public string? 登记类型 { get; set; }
    public string? 前后段 { get; set; }
    public decimal 计算出勤 { get; set; }
    public DateTime 日期 { get; set; }
    public string? 开始时间 { get; set; }
    public string? 结束时间 { get; set; }
    public string? 事由 { get; set; }
}
public sealed class AbsenceRow
{
    public long ID { get; set; }
    public string? 工号 { get; set; }
    public string? 姓名 { get; set; }
    public string? 部门 { get; set; }
    public string? 登记类型 { get; set; }
    public string? 前后段 { get; set; }
    public decimal? 计算出勤 { get; set; }
    public DateTime? 日期 { get; set; }
    public string? 事由 { get; set; }
}

// ---- 月度出勤汇总 ----
public sealed class AttendanceMonthlyRow
{
    public string? 工号 { get; set; }
    public string? 姓名 { get; set; }
    public string? 部门编号 { get; set; }
    public string? 部门 { get; set; }
    public decimal 应出勤天数 { get; set; }
    public decimal 缺勤天数 { get; set; }
    public decimal 实出勤天数 { get; set; }
}

// ---- 工资模板 ----
public sealed class WageTemplateItemDto
{ public int 序号 { get; set; } public string? 台头项目 { get; set; } public string? 类型 { get; set; } public string? 公式 { get; set; } }
public sealed class WageTemplateSaveDto
{ public string 模板编号 { get; set; } = ""; public string? 模板名称 { get; set; } public List<WageTemplateItemDto> 明细 { get; set; } = []; }
public sealed class WageTemplateHeaderDto
{ public string? 模板编号 { get; set; } public string? 模板名称 { get; set; } public int 项目数 { get; set; } }
public sealed class WageTemplateDetailDto
{ public string? 模板编号 { get; set; } public string? 模板名称 { get; set; } public List<WageTemplateItemDto> 明细 { get; set; } = []; }
