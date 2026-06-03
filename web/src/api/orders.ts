import { api } from "./client";
import type { Paged } from "./master";

export interface OrderLine { 色号?: string; 颜色?: string; 尺码?: string; 数量: number }
export interface OrderCreate {
  客户编号: string; 客户名称?: string; 交货日期?: string; 仓库?: string;
  款号: string; 款式?: string; 单价?: number; 合同号?: string; 客户款号?: string; 备注?: string;
  明细: OrderLine[];
}
export interface OrderHeader {
  id: number; 单号?: string; 日期?: string; 交货日期?: string;
  客户编号?: string; 客户名称?: string; 仓库?: string;
  数量?: number | null; 金额?: number | null; 操作员?: string; 审核?: string; 备注?: string;
}
export interface OrderDetail {
  订货单: OrderHeader | null;
  总表: { 款号?: string; 款式?: string; 生产单号?: string | null; 数量?: number; 单价?: number | null; 金额?: number | null } | null;
  明细: { id: number; 色号?: string; 颜色?: string; 尺码?: string; 数量?: number; 单价?: number | null; 金额?: number | null }[];
}

const enc = encodeURIComponent;

export const ordersApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<OrderHeader>>("/orders", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<OrderDetail>(`/orders/${enc(单号)}`).then(r => r.data),
  create: (body: OrderCreate) => api.post<{ 单号: string }>("/orders", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/orders/${enc(单号)}`),
  approve: (单号: string) => api.post(`/orders/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/orders/${enc(单号)}/unapprove`),
};
