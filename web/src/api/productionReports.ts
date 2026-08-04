import { api } from "./client";

export interface BomMaterialRow {
  款号?: string; 款式?: string; 物料编号?: string; 物料名称?: string;
  物料类别?: string; 规格?: string; 颜色?: string; 单位?: string; 使用数量?: number | null;
}

export interface BomStyleRow {
  款号?: string; 款式?: string; 单价?: number | null; 物料项数: number;
}

export interface OrderSummaryRow {
  货号?: string; 款式?: string; 接单数量?: number | null; 订单数: number;
}

export interface ProductionTrackingRow {
  生产单号?: string; 标识?: string; 款号?: string; 款式?: string;
  客户编号?: string; 客户名称?: string;
  日期?: string | null; 下单日期?: string | null; 交货日期?: string | null;
  计划数量?: number | null; 裁床数量?: number | null; 录入数量?: number | null;
  未完成数?: number | null; 装箱方式?: string; 订单总箱数?: number | null;
  完成?: string; 审核?: string;
}

export interface PurchaseOverRow {
  生产单号?: string; 款号?: string; 合同号?: string; 制单日期?: string | null;
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
  需求数量?: number | null; 已采购数量?: number | null; 超数?: number | null;
}

export interface IssueOverRow {
  生产单号?: string; 款号?: string; 合同号?: string; 制单日期?: string | null;
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
  需求数量?: number | null; 已领数量?: number | null; 差异?: number | null; // 差异=已领−需求：负=欠领，正=超领
}

export interface OrderMaterialUsageRow {
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
  计划用量?: number | null; 实际领料?: number | null; 差异?: number | null; // 差异=实际领料−计划用量
  预算单价?: number | null; 金额?: number | null;
}

export interface PurchaseIssueAnalysisRow {
  制单日期?: string | null; 生产单号?: string; 款号?: string; 合同号?: string;
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
  需求数量?: number | null; 库存数量?: number | null; 可用库存?: number | null;
  需订数量?: number | null; 采购数量?: number | null; 已领数量?: number | null;
  差异?: number | null; // 差异=需求−已领：正=欠领，负=超领
}

export interface PurchaseAnalysisRow {
  制单日期?: string | null; 生产单号?: string; 款号?: string; 合同号?: string;
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
  总数量?: number | null; 库存数量?: number | null; 可用库存?: number | null;
  需订数量?: number | null; 预算单价?: number | null; 金额?: number | null; 供应商名称?: string;
}

export interface OrderWorksheetRow {
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string;
  规格?: string; 颜色?: string; 单位?: string;
  总数量?: number | null; 库存数量?: number | null; 可用库存?: number | null;
  需订数量?: number | null; 预算单价?: number | null;
  供应商编号?: string; 供应商名称?: string;
}

export interface FinishedLeftoverRow {
  款号?: string; 客户?: string; 名称?: string;
  入仓数量?: number | null; 出仓数量?: number | null; 余数?: number | null;
}

export interface ContractLeftoverRow {
  合同号?: string; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
  需求数量?: number | null; 采购数量?: number | null; 余料数量?: number | null; // 余料=采购−需求
}

export interface ProcessShortageRow {
  生产单号?: string; 款号?: string; 合同号?: string; 制单日期?: string | null;
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
  需求数量?: number | null; 库存数量?: number | null; 已领数量?: number | null;
  缺料数量?: number | null; // 缺料=需求−库存−已领，仅缺料行
}

export const productionReportApi = {
  bomMaterials: (keyword?: string) =>
    api.get<BomMaterialRow[]>("/production-reports/bom-materials", { params: { keyword } }).then(r => r.data),
  bomStyles: (keyword?: string) =>
    api.get<BomStyleRow[]>("/production-reports/bom-styles", { params: { keyword } }).then(r => r.data),
  orderSummary: (keyword?: string) =>
    api.get<OrderSummaryRow[]>("/production-reports/order-summary", { params: { keyword } }).then(r => r.data),
  tracking: (keyword?: string, 审核?: string, 完成?: string) =>
    api.get<ProductionTrackingRow[]>("/production-reports/tracking", {
      params: { keyword, 审核, 完成 },
    }).then(r => r.data),
  purchaseOver: (keyword?: string) =>
    api.get<PurchaseOverRow[]>("/production-reports/purchase-over", { params: { keyword } }).then(r => r.data),
  issueOver: (keyword?: string) =>
    api.get<IssueOverRow[]>("/production-reports/issue-over", { params: { keyword } }).then(r => r.data),
  orderMaterialUsage: (生产单号: string) =>
    api.get<OrderMaterialUsageRow[]>("/production-reports/order-material-usage", { params: { 生产单号 } }).then(r => r.data),
  purchaseIssueAnalysis: (起?: string, 止?: string, keyword?: string) =>
    api.get<PurchaseIssueAnalysisRow[]>("/production-reports/purchase-issue-analysis", {
      params: { 起, 止, keyword },
    }).then(r => r.data),
  purchaseAnalysis: (keyword?: string) =>
    api.get<PurchaseAnalysisRow[]>("/production-reports/purchase-analysis", { params: { keyword } }).then(r => r.data),
  orderWorksheet: (keyword?: string) =>
    api.get<OrderWorksheetRow[]>("/production-reports/order-worksheet", { params: { keyword } }).then(r => r.data),
  finishedLeftover: (keyword?: string) =>
    api.get<FinishedLeftoverRow[]>("/production-reports/finished-leftover", { params: { keyword } }).then(r => r.data),
  contractLeftover: (keyword?: string) =>
    api.get<ContractLeftoverRow[]>("/production-reports/contract-leftover", { params: { keyword } }).then(r => r.data),
  processShortage: (keyword?: string) =>
    api.get<ProcessShortageRow[]>("/production-reports/process-shortage", { params: { keyword } }).then(r => r.data),
};
