import { api } from "./client";

export interface PlasticRawMaterialStockIssueQuerySummaryRow {
  领料备注?: string;
  开单日期?: string;
  啤机生产单号?: string;
  啤机外发单号?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  领料数量包?: number | null;
  备注?: string;
}

export interface PlasticRawMaterialStockIssueQueryDetailRow {
  领料备注?: string;
  开单日期?: string;
  啤机生产单号?: string;
  日期?: string;
  审核日期?: string;
  单号?: string;
  生产车间?: string;
  啤机外发单号?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  数量包?: number | null;
  备注?: string;
  制单人?: string;
  审核?: string;
}

export interface PlasticRawMaterialStockIssueQueryParams {
  起: string;
  止: string;
  keyword?: string;
  审核情况?: string;
  物料类别?: string;
  领料备注?: string;
  制单人?: string;
}

const base = "/plastic-raw-material-stock-issue-query";
export const plasticRawMaterialStockIssueQueryApi = {
  summary: (params: PlasticRawMaterialStockIssueQueryParams) =>
    api.get<PlasticRawMaterialStockIssueQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: PlasticRawMaterialStockIssueQueryParams) =>
    api.get<PlasticRawMaterialStockIssueQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
