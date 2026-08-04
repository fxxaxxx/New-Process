import { api } from "./client";

export interface PlasticLabelQueryDetailRow {
  日期?: string; 电脑单号?: string; 物料编号?: string; 物料名称?: string; 物料类别?: string;
  规格?: string; 颜色?: string; 单位?: string; 数量?: number | null; 标签数?: number | null; 备注?: string; 审核?: string;
}
export interface PlasticLabelQuerySummaryRow {
  物料编号?: string; 物料名称?: string; 物料类别?: string; 规格?: string; 颜色?: string;
  单位?: string; 数量?: number | null; 标签数?: number | null;
}
export interface PlasticLabelQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticLabelQueryApi = {
  detail: (p: PlasticLabelQueryParams) => api.get<PlasticLabelQueryDetailRow[]>("/plastic-label-orders/label-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticLabelQueryParams) => api.get<PlasticLabelQuerySummaryRow[]>("/plastic-label-orders/label-query/summary", { params: p }).then(r => r.data),
};
