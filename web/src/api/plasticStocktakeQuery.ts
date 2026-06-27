import { api } from "./client";
export interface PlasticStocktakeQueryDetailRow {
  日期?: string; 单号?: string;
  物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string; 共用货号?: string; 单位?: string;
  系统数量?: number | null; 盘点数量?: number | null; 盈亏数量?: number | null;
  单价?: number | null; 金额?: number | null; 备注?: string; 审核?: string;
}
export interface PlasticStocktakeQuerySummaryRow {
  物料编号?: string; 物料名称?: string; 颜色?: string; 塑胶货号?: string; 物料类别?: string; 单位?: string;
  系统数量?: number | null; 盘点数量?: number | null; 盈亏数量?: number | null; 单价?: number | null; 金额?: number | null;
}
export interface PlasticStocktakeQueryParams { 起: string; 止: string; keyword?: string; 审核情况?: string; 物料类别?: string }
export const plasticStocktakeQueryApi = {
  detail: (p: PlasticStocktakeQueryParams) => api.get<PlasticStocktakeQueryDetailRow[]>("/plastic-stocktake-query/detail", { params: p }).then(r => r.data),
  summary: (p: PlasticStocktakeQueryParams) => api.get<PlasticStocktakeQuerySummaryRow[]>("/plastic-stocktake-query/summary", { params: p }).then(r => r.data),
};
