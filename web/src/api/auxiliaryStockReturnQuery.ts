import { api } from "./client";

export interface AuxiliaryStockReturnQuerySummaryRow {
  装配生产单号?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  退料数量?: number | null;
}

export interface AuxiliaryStockReturnQueryDetailRow {
  装配生产单号?: string | null;
  日期?: string | null;
  单号?: string | null;
  退料部门?: string | null;
  退料人?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  数量?: number | null;
  备注?: string | null;
  审核?: string | null;
}

export interface AuxiliaryStockReturnQueryParams {
  起?: string;
  止?: string;
  日期类型?: string;
  keyword?: string;
  物料类别?: string;
  审核情况?: string;
}

const base = "/auxiliary-stock-return-query";

export const auxiliaryStockReturnQueryApi = {
  summary: (params: AuxiliaryStockReturnQueryParams) =>
    api.get<AuxiliaryStockReturnQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: AuxiliaryStockReturnQueryParams) =>
    api.get<AuxiliaryStockReturnQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
