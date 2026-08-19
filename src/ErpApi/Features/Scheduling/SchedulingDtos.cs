using System.Text.Json.Serialization;
namespace ErpApi.Features.Scheduling;

// 排期明细列表行（Dapper 按列名映射；ASCII 开头的属性名显式指定 JSON 名，防止 camelCase 变成 pO号/sku）
public sealed class ScheduleRowDto
{
    [JsonPropertyName("ID")] public long ID { get; set; }
    public long 批次ID { get; set; }
    public string? 排期客户 { get; set; }
    public string? 状态 { get; set; }
    public DateTime? 接单日期 { get; set; }
    public string? 客户名称 { get; set; }
    public string? 国家 { get; set; }
    [JsonPropertyName("PO号")] public string? PO号 { get; set; }
    public string? 客PO { get; set; }
    [JsonPropertyName("SKU")] public string? SKU { get; set; }
    public string? 货号 { get; set; }
    public string? 品名 { get; set; }
    public decimal? 数量 { get; set; }
    public int? 内箱 { get; set; }
    public int? 外箱 { get; set; }
    public decimal? 总箱数 { get; set; }
    public DateTime? 走货期 { get; set; }
    public DateTime? 验货期 { get; set; }
    public string? 第三方验货 { get; set; }
    public string? 车间 { get; set; }
    public string? 来源工作表 { get; set; }
    public string? 备注 { get; set; }
    public string? 原始数据 { get; set; }
    public DateTime? 创建日期 { get; set; }
    public string? 操作员 { get; set; }
}

// 导入批次列表行（行数由子查询带出）
public sealed class ScheduleBatchDto
{
    [JsonPropertyName("ID")] public long ID { get; set; }
    public string? 排期客户 { get; set; }
    public string? 文件名 { get; set; }
    public DateTime? 导入日期 { get; set; }
    public string? 操作员 { get; set; }
    public int 新增 { get; set; }
    public int 更新 { get; set; }
    public int 行数 { get; set; }
    public string? 备注 { get; set; }
}

// 排期表(文件)分类行:一个批次一张,带行数/货号数/状态分布
public sealed class ScheduleFileDto
{
    [JsonPropertyName("ID")] public long ID { get; set; }
    public string? 排期客户 { get; set; }
    public string? 文件名 { get; set; }
    public DateTime? 导入日期 { get; set; }
    public string? 操作员 { get; set; }
    public int 行数 { get; set; }
    public int 货号数 { get; set; }
    public int 在排 { get; set; }
    public int 已走货 { get; set; }
    public int 已取消 { get; set; }
}

// 汇总：按 排期客户 × 状态 统计行数与数量（页面顶部卡片）
public sealed class ScheduleSummaryDto
{
    public string? 排期客户 { get; set; }
    public string? 状态 { get; set; }
    public int 行数 { get; set; }
    public decimal? 数量 { get; set; }
}

// 导入结果：比通用 ImportResult 多一个"更新"（排期重复导入按自然键更新状态/日期）
public sealed class ScheduleImportResult
{
    public long 批次ID { get; set; }
    public int 新增 { get; set; }
    public int 更新 { get; set; }
    public int 跳过 { get; set; }
    public int 失败 { get; set; }
    public List<ErpApi.Features.MasterData.ImportFailure> 失败明细 { get; set; } = new();
}
