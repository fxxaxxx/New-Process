import { api } from "./client";
import type { Paged } from "./master";

export interface SemiFinishedLabelOrderLine {
  ID?: number;
  配件编号: string;
  客户?: string | null;
  产品货号: string;
  产品名称?: string | null;
  产品装配名称?: string | null;
  数量: number;
  每箱数量?: number | null;
  预计标签数: number;
  实需标签数: number;
  实需标签数已手改?: boolean;
  备注?: string | null;
}

export interface SemiFinishedLabelOrderSave {
  日期: string;
  备注一?: string | null;
  备注二?: string | null;
  明细: SemiFinishedLabelOrderLine[];
}

export interface SemiFinishedLabelOrder extends SemiFinishedLabelOrderSave {
  ID: number;
  电脑单号?: string;
  操作员?: string;
  审核?: string;
  审核人?: string | null;
  审核时间?: string | null;
}

export interface SemiFinishedLabelOrderListRow {
  ID: number;
  电脑单号: string;
  日期: string;
  操作员: string;
  审核: string;
  审核人: string | null;
  审核时间: string | null;
  备注一: string | null;
  备注二: string | null;
}

export interface SemiFinishedLabelProductRow {
  配件编号: string;
  客户?: string | null;
  产品货号: string;
  产品名称?: string | null;
  产品装配名称?: string | null;
  加工单价?: number | null;
  库存单价?: number | null;
  数量?: number;
  每箱数量?: number | null;
}

export interface SemiFinishedLabelProductQuery {
  page?: number;
  size?: number;
  field?: string;
  keyword?: string;
  exact?: boolean;
}

export type AdjacentDirection = "previous" | "next";

const base = "/semi-finished-label-orders";
const enc = encodeURIComponent;

export const semiFinishedLabelOrdersApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<SemiFinishedLabelOrderListRow>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (电脑单号: string) => api.get<SemiFinishedLabelOrder>(`${base}/${enc(电脑单号)}`).then(r => r.data),
  create: (body: SemiFinishedLabelOrderSave) => api.post<{ 电脑单号: string }>(base, body).then(r => r.data),
  update: (电脑单号: string, body: SemiFinishedLabelOrderSave) =>
    api.put<SemiFinishedLabelOrder>(`${base}/${enc(电脑单号)}`, body).then(r => r.data),
  remove: (电脑单号: string) => api.delete(`${base}/${enc(电脑单号)}`),
  audit: (电脑单号: string) => api.post(`${base}/${enc(电脑单号)}/audit`),
  reverseAudit: (电脑单号: string) => api.post(`${base}/${enc(电脑单号)}/reverse-audit`),
  adjacent: (电脑单号: string, direction: AdjacentDirection) =>
    api.get<SemiFinishedLabelOrder | undefined>(`${base}/${enc(电脑单号)}/adjacent`, { params: { direction } })
      .then(r => r.status === 204 ? undefined : r.data),
  products: (params: SemiFinishedLabelProductQuery = {}) =>
    api.get<Paged<SemiFinishedLabelProductRow>>(`${base}/products`, { params }).then(r => r.data),
};
