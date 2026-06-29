import { api } from "./client";
export interface PlasticReceiptQueryDetailRow {
  日期?: string; 单号?: string; 订单单号?: string; 生产单号?: string; 款号?: string; 工模编号?: string;
  物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string; 共用货号?: string; 供应商?: string; 单位?: string;
  数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string; 审核?: string;
}
export interface PlasticReceiptQuerySummaryRow {
  物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string;
  共用货号?: string; 共用物料?: string; 物料类别?: string; 单位?: string; 数量?: number | null; 金额?: number | null;
}
export interface PlasticReceiptQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticReceiptQueryApi = {
  detail: (p: PlasticReceiptQueryParams) => api.get<PlasticReceiptQueryDetailRow[]>("/plastic-receipt-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticReceiptQueryParams) => api.get<PlasticReceiptQuerySummaryRow[]>("/plastic-receipt-query/summary", { params: p }).then(r => r.data),
};
