import { api } from "./client";

export interface PlasticRawMaterialStockReturnQuerySummaryRow {
  啤机生产单号?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  退料数量?: number | null;
}

export interface PlasticRawMaterialStockReturnQueryDetailRow {
  啤机生产单号?: string;
  日期?: string;
  单号?: string;
  退料部门?: string;
  退料人?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  数量?: number | null;
  备注?: string;
  审核?: string;
}

export interface PlasticRawMaterialStockReturnQueryParams {
  起: string;
  止: string;
  keyword?: string;
  审核情况?: string;
  物料类别?: string;
}

const base = "/plastic-raw-material-stock-return-query";
export const plasticRawMaterialStockReturnQueryApi = {
  summary: (params: PlasticRawMaterialStockReturnQueryParams) =>
    api.get<PlasticRawMaterialStockReturnQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: PlasticRawMaterialStockReturnQueryParams) =>
    api.get<PlasticRawMaterialStockReturnQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
