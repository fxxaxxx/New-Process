import { api } from "./client";
export interface PlasticProcessPurchaseQueryDetailRow {
  单据日期?: string; 单号?: string; 加工厂名称?: string; 生产单号?: string; 款号?: string; 模具编号?: string;
  物料编号?: string; 物料名称?: string; 用料名称?: string; 颜色?: string; 加工内容?: string; 单位?: string;
  数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string; 审核?: string;
}
export interface PlasticProcessPurchaseQuerySummaryRow {
  模具编号?: string; 物料编号?: string; 物料名称?: string; 颜色?: string;
  共用物料?: string; 加工内容?: string; 物料类别?: string; 单位?: string; 订购数量?: number | null; 总金额?: number | null;
}
export interface PlasticProcessPurchaseQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticProcessPurchaseQueryApi = {
  detail: (p: PlasticProcessPurchaseQueryParams) => api.get<PlasticProcessPurchaseQueryDetailRow[]>("/plastic-process-purchase-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticProcessPurchaseQueryParams) => api.get<PlasticProcessPurchaseQuerySummaryRow[]>("/plastic-process-purchase-query/summary", { params: p }).then(r => r.data),
};
