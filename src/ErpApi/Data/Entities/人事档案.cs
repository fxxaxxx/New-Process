using System.ComponentModel.DataAnnotations.Schema;
namespace ErpApi.Data.Entities;

[Table("人事档案")]
public sealed class 人事档案 : MasterEntity
{
    [Column("编号")] public string? 编号 { get; set; }
    [Column("姓名")] public string? 姓名 { get; set; }
    [Column("考勤卡号")] public string? 考勤卡号 { get; set; }
    [Column("性别")] public string? 性别 { get; set; }
    [Column("部门编号")] public string? 部门编号 { get; set; }
    [Column("职称")] public string? 职称 { get; set; }
    [Column("工序类型")] public string? 工序类型 { get; set; }
    [Column("电话")] public string? 电话 { get; set; }
    [Column("手机")] public string? 手机 { get; set; }
    [Column("基本工资")] public decimal? 基本工资 { get; set; }
    [Column("在职")] public string? 在职 { get; set; }
    [Column("默认班次")] public string? 默认班次 { get; set; }
    [Column("备注")] public string? 备注 { get; set; }
}
