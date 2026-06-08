import { api } from "./client";
import type { Paged } from "./master";

// ---- 采购付款 ----
export interface PPLine { 供应商编号?: string; 供应商名称?: string; 付款金额: number }
export interface PPCreate { 入仓单号?: string; 备注?: string; 明细: PPLine[] }
export interface PPHeader { id: number; 单号?: string; 入仓单号?: string; 日期?: string; 金额?: number | null; 审核?: string; 审核人?: string; 备注?: string }
export interface PPDetail { 单头: PPHeader | null; 明细: { id: number; 供应商编号?: string; 供应商名称?: string; 货款金额?: number | null; 付款金额?: number | null; 应付金额?: number | null; 备注?: string }[] }

// ---- 发外付款 ----
export interface OPLine { 加工厂编号?: string; 加工厂名称?: string; 付款金额: number }
export interface OPCreate { 发外单号?: string; 备注?: string; 明细: OPLine[] }
export interface OPHeader { id: number; 单号?: string; 发外单号?: string; 日期?: string; 金额?: number | null; 审核?: string; 审核人?: string; 备注?: string }
export interface OPDetail { 单头: OPHeader | null; 明细: { id: number; 加工厂编号?: string; 加工厂名称?: string; 货款金额?: number | null; 付款金额?: number | null; 应付金额?: number | null; 备注?: string }[] }

// ---- 应付对账 ----
export interface PayableSupplierRow { 供应商编号?: string; 供应商名称?: string; 入仓金额: number; 付款金额: number; 应付余额: number }
export interface PayableFactoryRow { 加工厂编号?: string; 加工厂名称?: string; 回收金额: number; 付款金额: number; 应付余额: number }

const enc = encodeURIComponent;
export const purchasePaymentApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<PPHeader>>("/purchase-payments", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<PPDetail>(`/purchase-payments/${enc(单号)}`).then(r => r.data),
  create: (body: PPCreate) => api.post<{ 单号: string }>("/purchase-payments", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/purchase-payments/${enc(单号)}`),
  approve: (单号: string) => api.post(`/purchase-payments/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/purchase-payments/${enc(单号)}/unapprove`),
};
export const outsourcePaymentApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<OPHeader>>("/outsource-payments", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<OPDetail>(`/outsource-payments/${enc(单号)}`).then(r => r.data),
  create: (body: OPCreate) => api.post<{ 单号: string }>("/outsource-payments", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/outsource-payments/${enc(单号)}`),
  approve: (单号: string) => api.post(`/outsource-payments/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/outsource-payments/${enc(单号)}/unapprove`),
};
export const payablesApi = {
  supplier: (供应商编号?: string) => api.get<PayableSupplierRow[]>("/payables/supplier", { params: { 供应商编号 } }).then(r => r.data),
  factory: (加工厂编号?: string) => api.get<PayableFactoryRow[]>("/payables/factory", { params: { 加工厂编号 } }).then(r => r.data),
};
