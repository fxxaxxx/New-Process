import { api } from "./client";

export interface PlasticRawMaterialReceiptQueryDetailRow {
  日期?: string;
  单号?: string;
  入库单号?: string;
  订单单号?: string;
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

export interface PlasticRawMaterialReceiptQuerySummaryRow {
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  入仓数量?: number | null;
  金额?: number | null;
}

export interface PlasticRawMaterialReceiptQueryParams {
  起: string;
  止: string;
  keyword?: string;
  审核情况?: string;
  物料类别?: string;
}

const base = "/plastic-raw-material-receipt-query";
export const plasticRawMaterialReceiptQueryApi = {
  detail: (params: PlasticRawMaterialReceiptQueryParams) =>
    api.get<PlasticRawMaterialReceiptQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
  summary: (params: PlasticRawMaterialReceiptQueryParams) =>
    api.get<PlasticRawMaterialReceiptQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
};
