import { api } from "./client";

export interface AuxiliaryPurchaseOrderQuerySummaryRow {
  供应商编号?: string | null;
  供应商名称?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  订货数量?: number | null;
}

export interface AuxiliaryPurchaseOrderQueryDetailRow {
  日期?: string | null;
  单号?: string | null;
  交货日期?: string | null;
  供应商编号?: string | null;
  供应商名称?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  数量?: number | null;
  备注?: string | null;
  审核?: string | null;
}

export interface AuxiliaryPurchaseOrderQueryParams {
  起?: string;
  止?: string;
  日期类型?: string;
  keyword?: string;
  物料类别?: string;
  按供应商?: boolean;
  审核情况?: string;
}

const base = "/auxiliary-purchase-order-query";

export const auxiliaryPurchaseOrderQueryApi = {
  summary: (params: AuxiliaryPurchaseOrderQueryParams) =>
    api.get<AuxiliaryPurchaseOrderQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: AuxiliaryPurchaseOrderQueryParams) =>
    api.get<AuxiliaryPurchaseOrderQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
