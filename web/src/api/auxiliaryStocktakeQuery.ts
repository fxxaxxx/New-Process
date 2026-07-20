import { api } from "./client";
import type { MSDetail } from "./materialStocktake";

export interface AuxiliaryStocktakeSummaryRow {
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  单位?: string;
  系统数量?: number | null;
  盘点数量?: number | null;
  盈亏数量?: number | null;
}

export interface AuxiliaryStocktakeDetailRow extends AuxiliaryStocktakeSummaryRow {
  日期?: string;
  单号?: string;
  备注?: string;
  审核?: string;
}

export interface AuxiliaryStocktakeQueryParams {
  起?: string;
  止?: string;
  keyword?: string;
  物料类别?: string;
  审核情况?: string;
}

const base = "/auxiliary-stocktake-query";
const enc = encodeURIComponent;

export const auxiliaryStocktakeQueryApi = {
  get: (单号: string) => api.get<MSDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  summary: (params: AuxiliaryStocktakeQueryParams) =>
    api.get<AuxiliaryStocktakeSummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: AuxiliaryStocktakeQueryParams) =>
    api.get<AuxiliaryStocktakeDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
};
