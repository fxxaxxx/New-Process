import { api } from "./client";
import type { Paged } from "./master";

export interface RMPOLine {
  id?: number;
  原料编号?: string; 原料名称?: string; 规格?: string; 单位?: string; 单价类型?: string;
  订货数量?: number; 单价?: number | null; 金额?: number | null; 备注?: string;
}
export interface RMPOHeader {
  id: number; 单号?: string; 供应商编号?: string; 供应商名称?: string; 订购日期?: string; 交货日期?: string;
  数量?: number | null; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string;
}
export interface RMPODetail { 单头?: RMPOHeader; 明细: RMPOLine[] }

const enc = encodeURIComponent;
const base = "/plastic-raw-material-purchase-order";
export const plasticRawMaterialPurchaseOrderApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<RMPOHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<RMPODetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
