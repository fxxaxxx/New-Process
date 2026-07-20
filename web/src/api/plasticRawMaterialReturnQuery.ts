import { api } from "./client";

export interface PlasticRawMaterialReturnQueryDetailRow {
  日期?: string;
  单号?: string;
  供应商编号?: string;
  供应商名称?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单价类型?: string;
  单位?: string;
  数量?: number | null;
  单价?: number | null;
  金额?: number | null;
  备注?: string;
  审核?: string;
}

export interface PlasticRawMaterialReturnQuerySummaryRow {
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  退仓数量?: number | null;
  金额?: number | null;
}

export interface PlasticRawMaterialReturnQueryParams {
  起: string;
  止: string;
  keyword?: string;
  审核情况?: string;
  物料类别?: string;
}

const base = "/plastic-raw-material-return-query";
export const plasticRawMaterialReturnQueryApi = {
  detail: (params: PlasticRawMaterialReturnQueryParams) =>
    api.get<PlasticRawMaterialReturnQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
  summary: (params: PlasticRawMaterialReturnQueryParams) =>
    api.get<PlasticRawMaterialReturnQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
};
