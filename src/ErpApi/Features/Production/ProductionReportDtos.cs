namespace ErpApi.Features.Production;

// BOM物料查询：款号物料明细表 平铺行
public sealed class BomMaterialRow
{
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 物料类别 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 使用数量 { get; set; }
}

// BOM货号查询：款号总表 + 物料项数
public sealed class BomStyleRow
{
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public decimal? 单价 { get; set; }
    public int 物料项数 { get; set; }
}

// 货号接单汇总表：成品客户订单明细表 按货号归集
public sealed class OrderSummaryRow
{
    public string? 货号 { get; set; }
    public string? 款式 { get; set; }
    public decimal? 接单数量 { get; set; }
    public int 订单数 { get; set; }
}

// 采购超数查询：每(生产单 × 物料) 已采购数量 − BOM需求数量 > 0 的超采行
public sealed class PurchaseOverRow
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 合同号 { get; set; }
    public DateTime? 制单日期 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 需求数量 { get; set; }
    public decimal? 已采购数量 { get; set; }
    public decimal? 超数 { get; set; }
}

// 领料超数/欠领查询：每(生产单 × 物料) 差异=已领数量 − BOM需求数量（负=欠领，正=超领）
public sealed class IssueOverRow
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 合同号 { get; set; }
    public DateTime? 制单日期 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 需求数量 { get; set; }
    public decimal? 已领数量 { get; set; }
    public decimal? 差异 { get; set; }
}

// 制单用料查询：指定生产单 每物料 计划用量 对照 实际领料（差异=实际−计划，负=欠领/正=超领）
public sealed class OrderMaterialUsageRow
{
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 计划用量 { get; set; }
    public decimal? 实际领料 { get; set; }
    public decimal? 差异 { get; set; }
    public decimal? 预算单价 { get; set; }
    public decimal? 金额 { get; set; }
}

// 采购领料分析表：生产BOM物料清单 按(生产单号,物料编号)归集 + 审核采购入仓/审核领料 汇总（差异=需求−已领）
public sealed class PurchaseIssueAnalysisRow
{
    public DateTime? 制单日期 { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 合同号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 需求数量 { get; set; }
    public decimal? 库存数量 { get; set; }
    public decimal? 可用库存 { get; set; }
    public decimal? 需订数量 { get; set; }
    public decimal? 采购数量 { get; set; }
    public decimal? 已领数量 { get; set; }
    public decimal? 差异 { get; set; }
}

// 采购分析明细查询：生产BOM物料清单（算法4 缺料/需求 output）扁平明细行
public sealed class PurchaseAnalysisRow
{
    public DateTime? 制单日期 { get; set; }
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 合同号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 总数量 { get; set; }
    public decimal? 库存数量 { get; set; }
    public decimal? 可用库存 { get; set; }
    public decimal? 需订数量 { get; set; }
    public decimal? 预算单价 { get; set; }
    public decimal? 金额 { get; set; }
    public string? 供应商名称 { get; set; }
}

// 物料订单制作工作表：生产BOM物料清单 需订数量>0 的待订物料行（勾选→按生产单×供应商生成采购订单）
public sealed class OrderWorksheetRow
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 总数量 { get; set; }
    public decimal? 库存数量 { get; set; }
    public decimal? 可用库存 { get; set; }
    public decimal? 需订数量 { get; set; }
    public decimal? 预算单价 { get; set; }
    public string? 供应商编号 { get; set; }
    public string? 供应商名称 { get; set; }
}

// 成品余料统计表：按款号归集 成品入仓累计 − 成品出仓累计 = 余数（仅审核单，口径同成品库存算法1）
public sealed class FinishedLeftoverRow
{
    public string? 款号 { get; set; }
    public string? 客户 { get; set; }
    public string? 名称 { get; set; }
    public decimal? 入仓数量 { get; set; }
    public decimal? 出仓数量 { get; set; }
    public decimal? 余数 { get; set; }
}

// 合同余料统计表：按(合同号 × 物料) 采购入仓累计(审核) − BOM需求(生产BOM物料清单 Σ总数量) = 余料数量
public sealed class ContractLeftoverRow
{
    public string? 合同号 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 需求数量 { get; set; }
    public decimal? 采购数量 { get; set; }
    public decimal? 余料数量 { get; set; }
}

// 生产加工缺料表：每(生产单 × 物料) 缺料数量 = 需求 − 库存(可用库存) − 已领(审核领料)，仅列缺料行
public sealed class ProcessShortageRow
{
    public string? 生产单号 { get; set; }
    public string? 款号 { get; set; }
    public string? 合同号 { get; set; }
    public DateTime? 制单日期 { get; set; }
    public string? 物料编号 { get; set; }
    public string? 物料名称 { get; set; }
    public string? 规格 { get; set; }
    public string? 颜色 { get; set; }
    public string? 单位 { get; set; }
    public decimal? 需求数量 { get; set; }
    public decimal? 库存数量 { get; set; }
    public decimal? 已领数量 { get; set; }
    public decimal? 缺料数量 { get; set; }
}

// 生产单跟踪表：生产制单 进度行（计划/裁床/录入/未完成数 + 审核完成状态）
public sealed class ProductionTrackingRow
{
    public string? 生产单号 { get; set; }
    public string? 标识 { get; set; }
    public string? 款号 { get; set; }
    public string? 款式 { get; set; }
    public string? 客户编号 { get; set; }
    public string? 客户名称 { get; set; }
    public DateTime? 日期 { get; set; }
    public DateTime? 下单日期 { get; set; }
    public DateTime? 交货日期 { get; set; }
    public decimal? 计划数量 { get; set; }
    public decimal? 裁床数量 { get; set; }
    public decimal? 录入数量 { get; set; }
    public decimal? 未完成数 { get; set; }
    public string? 装箱方式 { get; set; }
    public int? 订单总箱数 { get; set; }
    public string? 完成 { get; set; }
    public string? 审核 { get; set; }
}
