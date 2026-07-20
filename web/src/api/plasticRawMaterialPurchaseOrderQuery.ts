import { api } from "./client";

export interface PlasticRawMaterialPurchaseOrderQueryDetailRow {
  订购日期?: string;
  交货日期?: string;
  单号?: string;
  供应商编号?: string;
  供应商名称?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  单价类型?: string;
  订货数量?: number | null;
  单价?: number | null;
  金额?: number | null;
  审核?: string;
  备注?: string;
}

export interface PlasticRawMaterialPurchaseOrderQuerySummaryRow {
  供应商编号?: string;
  供应商名称?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  单位?: string;
  订货数量?: number | null;
}

export interface PlasticRawMaterialPurchaseOrderQueryParams {
  起?: string;
  止?: string;
  keyword?: string;
  物料类别?: string;
  日期类型?: string;
  按供应商?: boolean;
}

const base = "/plastic-raw-material-purchase-order-query";
export const plasticRawMaterialPurchaseOrderQueryApi = {
  detail: (params: PlasticRawMaterialPurchaseOrderQueryParams) =>
    api.get<PlasticRawMaterialPurchaseOrderQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
  summary: (params: PlasticRawMaterialPurchaseOrderQueryParams) =>
    api.get<PlasticRawMaterialPurchaseOrderQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
};
