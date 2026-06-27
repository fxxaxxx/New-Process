import { api } from "./client";

export interface PlasticLabelQueryDetailRow {
  日期?: string; 单号?: string; 款号?: string; 工模编号?: string; 物料编号?: string; 物料名称?: string;
  塑胶货号?: string; 颜色?: string; 单位?: string; 数量?: number | null; 备注?: string; 审核?: string;
}
export interface PlasticLabelQuerySummaryRow {
  款号?: string; 工模编号?: string; 物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string;
  单位?: string; 数量?: number | null;
}
export interface PlasticLabelQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticLabelQueryApi = {
  detail: (p: PlasticLabelQueryParams) => api.get<PlasticLabelQueryDetailRow[]>("/plastic-label-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticLabelQueryParams) => api.get<PlasticLabelQuerySummaryRow[]>("/plastic-label-query/summary", { params: p }).then(r => r.data),
};
