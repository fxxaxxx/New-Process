import { api } from "./client";
import type { Paged } from "./master";

export interface OutLineDto { 加工项目: string; 色号?: string; 颜色?: string; 尺码?: string; 数量: number }
export interface OutCreate {
  加工厂编号: string; 加工厂名称?: string; 仓库?: string; 付款方式?: string;
  生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 备注?: string;
  明细: OutLineDto[];
}
export interface OutHeader {
  id: number; 单号?: string; 加工厂编号?: string; 加工厂名称?: string; 仓库?: string;
  日期?: string; 数量?: number; 金额?: number | null; 操作员?: string; 审核?: string; 备注?: string;
}
export interface OutDetail {
  单头: OutHeader | null;
  明细: { id: number; 生产单号?: string; 款号?: string; 加工项目?: string; 色号?: string; 颜色?: string; 尺码?: string; 数量?: number; 单价?: number | null; 金额?: number | null }[];
}

export interface OutReturnBasisRow {
  生产单号?: string; 款号?: string; 款式?: string; 加工项目?: string; 色号?: string; 颜色?: string; 尺码?: string;
  发外数量: number; 已回收: number; 欠数: number; 单价?: number | null;
}
export interface OutReturnLineDto {
  生产单号?: string; 款号?: string; 款式?: string; 加工项目: string; 色号?: string; 颜色?: string; 尺码?: string;
  发外数量: number; 回收数量: number;
}
export interface OutReturnCreate {
  发外单号: string; 加工厂编号: string; 加工厂名称?: string; 仓库?: string; 备注?: string;
  明细: OutReturnLineDto[];
}
export interface OutReturnHeader {
  id: number; 单号?: string; 发外单号?: string; 加工厂名称?: string; 日期?: string;
  发外数量?: number; 回收数量?: number; 相差数量?: number; 金额?: number | null; 审核?: string;
}
export interface OutReturnDetail {
  单头: OutReturnHeader | null;
  明细: { id: number; 款号?: string; 加工项目?: string; 颜色?: string; 尺码?: string; 发外数量?: number; 数量?: number; 欠数?: number; 单价?: number | null; 金额?: number | null }[];
}
export interface OutReconcileRow {
  款号?: string; 款式?: string; 加工项目?: string;
  发外数量?: number; 回收数量?: number; 相差数量?: number; 单价?: number | null; 金额?: number | null;
}

const enc = encodeURIComponent;
export const outsourcingApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<OutHeader>>("/outsourcing", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<OutDetail>(`/outsourcing/${enc(单号)}`).then(r => r.data),
  create: (body: OutCreate) => api.post<{ 单号: string }>("/outsourcing", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/outsourcing/${enc(单号)}`),
  approve: (单号: string) => api.post(`/outsourcing/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/outsourcing/${enc(单号)}/unapprove`),
  reconcile: (发外单号: string) =>
    api.get<OutReconcileRow[]>("/outsourcing/reconcile", { params: { 发外单号 } }).then(r => r.data),
};
export const outReturnApi = {
  basis: (发外单号: string) =>
    api.get<OutReturnBasisRow[]>("/outsourcing/returns/basis", { params: { 发外单号 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<OutReturnHeader>>("/outsourcing/returns", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<OutReturnDetail>(`/outsourcing/returns/${enc(单号)}`).then(r => r.data),
  create: (body: OutReturnCreate) => api.post<{ 单号: string }>("/outsourcing/returns", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/outsourcing/returns/${enc(单号)}`),
  approve: (单号: string) => api.post(`/outsourcing/returns/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/outsourcing/returns/${enc(单号)}/unapprove`),
};
