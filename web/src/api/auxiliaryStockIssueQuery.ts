import { api } from "./client";

export interface AuxiliaryStockIssueQuerySummaryRow {
  领料备注?: string | null;
  开单日期?: string | null;
  装配生产单号?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  领料数量?: number | null;
  备注?: string | null;
}

export interface AuxiliaryStockIssueQueryDetailRow {
  领料备注?: string | null;
  开单日期?: string | null;
  装配生产单号?: string | null;
  日期?: string | null;
  审核日期?: string | null;
  单号?: string | null;
  生产车间?: string | null;
  领料人?: string | null;
  辅料编号?: string | null;
  辅料名称?: string | null;
  规格?: string | null;
  单位?: string | null;
  数量?: number | null;
  备注?: string | null;
  制单人?: string | null;
  审核?: string | null;
}

export interface AuxiliaryStockIssueQueryParams {
  起?: string;
  止?: string;
  日期类型?: string;
  keyword?: string;
  物料类别?: string;
  领料备注?: string;
  制单人?: string;
  审核情况?: string;
}

const base = "/auxiliary-stock-issue-query";

export const auxiliaryStockIssueQueryApi = {
  summary: (params: AuxiliaryStockIssueQueryParams) =>
    api.get<AuxiliaryStockIssueQuerySummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: AuxiliaryStockIssueQueryParams) =>
    api.get<AuxiliaryStockIssueQueryDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
