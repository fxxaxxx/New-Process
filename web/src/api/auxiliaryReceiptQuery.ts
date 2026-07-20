import { api } from "./client";

export interface AuxiliaryReceiptQuerySummaryRow {
  供应商编号?: string | null;
  供应商名称?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  入仓数量?: number | null;
}

export interface AuxiliaryReceiptQueryDetailRow {
  日期?: string | null;
  单号?: string | null;
  入库单号?: string | null;
  订单单号?: string | null;
  供应商编号?: string | null;
  供应商名称?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单价类型?: string | null;
  单位?: string | null;
  数量?: number | null;
  备注?: string | null;
  审核?: string | null;
}

export interface AuxiliaryReceiptQueryParams {
  起?: string;
  止?: string;
  日期类型?: string;
  keyword?: string;
  物料类别?: string;
  按供应商?: boolean;
  审核情况?: string;
}

const base = "/auxiliary-receipt-query";

export const auxiliaryReceiptQueryApi = {
  summary: (params: AuxiliaryReceiptQueryParams) =>
    api.get<AuxiliaryReceiptQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: AuxiliaryReceiptQueryParams) =>
    api.get<AuxiliaryReceiptQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
