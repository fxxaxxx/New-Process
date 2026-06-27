import { api } from "./client";
export interface PlasticScrapQueryDetailRow {
  日期?: string; 单号?: string; 生产单号?: string; 款号?: string; 报废部门?: string; 报废人?: string;
  物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string; 共用物料?: string; 共用货号?: string; 单位?: string;
  数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string; 审核?: string;
}
export interface PlasticScrapQuerySummaryRow {
  物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string;
  共用物料?: string; 共用货号?: string; 物料类别?: string; 单位?: string; 数量?: number | null; 单价?: number | null; 金额?: number | null;
}
export interface PlasticScrapQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticScrapQueryApi = {
  detail: (p: PlasticScrapQueryParams) => api.get<PlasticScrapQueryDetailRow[]>("/plastic-scrap-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticScrapQueryParams) => api.get<PlasticScrapQuerySummaryRow[]>("/plastic-scrap-query/summary", { params: p }).then(r => r.data),
};
