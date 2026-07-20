import { api } from "./client";

export interface PlasticRawMaterialStocktakeQuerySummaryRow {
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  系统数?: number | null;
  盘点数?: number | null;
  盈亏数?: number | null;
}

export interface PlasticRawMaterialStocktakeQueryDetailRow {
  日期?: string;
  单号?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  系统数量?: number | null;
  盘点数量?: number | null;
  盈亏数量?: number | null;
  备注?: string;
  审核?: string;
}

export interface PlasticRawMaterialStocktakeQueryParams {
  起: string;
  止: string;
  keyword?: string;
  审核情况?: string;
  物料类别?: string;
}

const base = "/plastic-raw-material-stocktake-query";
export const plasticRawMaterialStocktakeQueryApi = {
  summary: (params: PlasticRawMaterialStocktakeQueryParams) =>
    api.get<PlasticRawMaterialStocktakeQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: PlasticRawMaterialStocktakeQueryParams) =>
    api.get<PlasticRawMaterialStocktakeQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
