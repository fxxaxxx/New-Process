import { api } from "./client";
import type { Paged } from "./master";

export interface PPPOLine {
  id?: number;
  生产单号?: string; 款号?: string; 模具编号?: string; 物料编号?: string; 物料名称?: string;
  用料名称?: string; 颜色?: string; 加工内容?: string; 加工次序?: string; 加工字母?: string;
  数量?: number; 单价?: number | null; 金额?: number | null; 备注?: string;
}
export interface PPPOHeader {
  id: number; 单号?: string; 日期?: string; 交货日期?: string; 加工厂编号?: string; 加工厂名称?: string;
  客户名称?: string; 收货仓库?: string; 收货人?: string; 数量?: number | null; 金额?: number | null;
  操作员?: string; 审核?: string; 审核人?: string; 备注?: string;
}
export interface PPPODetail { 单头?: PPPOHeader; 明细: PPPOLine[] }
export interface PPPOBasisRow {
  生产单号?: string; 款号?: string; 模具编号?: string; 物料编号?: string; 物料名称?: string;
  用料名称?: string; 颜色?: string; 加工内容?: string; 二次加工内容?: string; 二次加工类别?: string;
  单价?: number | null;
}

const enc = encodeURIComponent;
const base = "/plastic-process-purchase-orders";
export const plasticProcessPurchaseOrderApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<PPPOHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  basis: (生产单号: string) => api.get<PPPOBasisRow[]>(`${base}/basis`, { params: { 生产单号 } }).then(r => r.data),
  get: (单号: string) => api.get<PPPODetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
