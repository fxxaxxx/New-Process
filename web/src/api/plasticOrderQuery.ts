import { api } from "./client";

export interface PlasticOrderQueryDetailRow {
  日期?: string; 单号?: string; 工模编号?: string; 生产单号?: string; 款号?: string; 货号?: string;
  物料编号?: string; 物料名称?: string; 颜色?: string; 材料?: string; 规格?: string; 单位?: string;
  数量?: number | null; 加工单价?: number | null; 金额?: number | null; 审核?: string;
}
export interface PlasticOrderQuerySummaryRow {
  物料编号?: string; 物料名称?: string; 物料类别?: string; 规格?: string; 颜色?: string; 单位?: string;
  数量?: number | null; 金额?: number | null;
}
export interface PlasticOrderQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticOrderQueryApi = {
  detail: (p: PlasticOrderQueryParams) => api.get<PlasticOrderQueryDetailRow[]>("/plastic-order-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticOrderQueryParams) => api.get<PlasticOrderQuerySummaryRow[]>("/plastic-order-query/summary", { params: p }).then(r => r.data),
};
