import { api } from "./client";
export interface PlasticReturnQueryDetailRow {
  日期?: string; 单号?: string; 生产单号?: string; 款号?: string; 退料部门?: string; 退料人?: string;
  物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string; 共用物料?: string; 共用货号?: string; 单位?: string;
  数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string; 审核?: string;
}
export interface PlasticReturnQuerySummaryRow {
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string;
  共用物料?: string; 共用货号?: string; 物料类别?: string; 单位?: string; 数量?: number | null; 单价?: number | null; 金额?: number | null;
}
export interface PlasticReturnQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticReturnQueryApi = {
  detail: (p: PlasticReturnQueryParams) => api.get<PlasticReturnQueryDetailRow[]>("/plastic-return-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticReturnQueryParams) => api.get<PlasticReturnQuerySummaryRow[]>("/plastic-return-query/summary", { params: p }).then(r => r.data),
};
