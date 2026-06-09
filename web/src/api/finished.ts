import { api } from "./client";
import type { Paged } from "./master";

// ---- 入仓 ----
export interface FRLine { 色号?: string; 颜色?: string; 尺码?: string; 数量: number; 单价?: number }
export interface FRCreate { 仓库: string; 生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 供应商编号?: string; 供应商名称?: string; 备注?: string; 明细: FRLine[] }
export interface FRHeader { id: number; 单号?: string; 仓库?: string; 日期?: string; 数量?: number; 金额?: number | null; 审核?: string; 备注?: string }
export interface FRDetail { 单头: FRHeader | null; 明细: { id: number; 生产单号?: string; 款号?: string; 色号?: string; 颜色?: string; 尺码?: string; 数量?: number; 单价?: number | null; 金额?: number | null }[] }

// ---- 出仓 ----
export interface FILine { 色号?: string; 颜色?: string; 尺码?: string; 数量: number; 单价?: number }
export interface FICreate { 仓库: string; 订单单号?: string; 客户编号?: string; 客户名称?: string; 生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 备注?: string; 明细: FILine[] }
export interface FIHeader { id: number; 单号?: string; 订单单号?: string; 客户名称?: string; 仓库?: string; 日期?: string; 数量?: number; 金额?: number | null; 审核?: string; 备注?: string }
export interface FIDetail { 单头: FIHeader | null; 明细: { id: number; 款号?: string; 色号?: string; 颜色?: string; 尺码?: string; 数量?: number; 成本单价?: number | null; 成本金额?: number | null; 单价?: number | null; 金额?: number | null }[] }

// ---- 盘点 ----
export interface FSBasisRow { 款号?: string; 款式?: string; 色号?: string; 颜色?: string; 尺码?: string; 系统数量: number }
export interface FSLine { 款号?: string; 款式?: string; 色号?: string; 颜色?: string; 尺码?: string; 系统数量: number; 盘点数量: number }
export interface FSCreate { 仓库: string; 备注?: string; 明细: FSLine[] }
export interface FSHeader { id: number; 单号?: string; 仓库?: string; 日期?: string; 审核?: string; 备注?: string }
export interface FSDetail { 单头: FSHeader | null; 明细: { id: number; 款号?: string; 色号?: string; 颜色?: string; 尺码?: string; 系统数量?: number; 盘点数量?: number; 盈亏数量?: number }[] }

// ---- 库存 ----
export interface FinishedStockRow { 款号: string; 款式?: string; 色号?: string; 颜色?: string; 尺码?: string; 库存: number }

const enc = encodeURIComponent;
export const finishedReceiptApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<FRHeader>>("/finished-receipts", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<FRDetail>(`/finished-receipts/${enc(单号)}`).then(r => r.data),
  create: (body: FRCreate) => api.post<{ 单号: string }>("/finished-receipts", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/finished-receipts/${enc(单号)}`),
  approve: (单号: string) => api.post(`/finished-receipts/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/finished-receipts/${enc(单号)}/unapprove`),
};
export const finishedIssueApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<FIHeader>>("/finished-issues", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<FIDetail>(`/finished-issues/${enc(单号)}`).then(r => r.data),
  create: (body: FICreate) => api.post<{ 单号: string }>("/finished-issues", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/finished-issues/${enc(单号)}`),
  approve: (单号: string) => api.post(`/finished-issues/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/finished-issues/${enc(单号)}/unapprove`),
};
export const finishedStocktakeApi = {
  basis: (仓库: string) => api.get<FSBasisRow[]>("/finished-stocktakes/basis", { params: { 仓库 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<FSHeader>>("/finished-stocktakes", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<FSDetail>(`/finished-stocktakes/${enc(单号)}`).then(r => r.data),
  create: (body: FSCreate) => api.post<{ 单号: string }>("/finished-stocktakes", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/finished-stocktakes/${enc(单号)}`),
  approve: (单号: string) => api.post(`/finished-stocktakes/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/finished-stocktakes/${enc(单号)}/unapprove`),
};
export const finishedInventoryApi = {
  list: (仓库: string) => api.get<FinishedStockRow[]>("/finished-inventory", { params: { 仓库 } }).then(r => r.data),
};

// ---- 调拨 ----
export interface FTLine { 色号?: string; 颜色?: string; 尺码?: string; 数量: number; 单价?: number }
export interface FTCreate { 源仓库: string; 目标仓库: string; 客户编号?: string; 客户名称?: string; 出仓单号?: string; 生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 备注?: string; 明细: FTLine[] }
export interface FTHeader { id: number; 单号?: string; 客户名称?: string; 日期?: string; 审核?: string; 备注?: string }
export interface FTDetail { 单头: FTHeader | null; 明细: { id: number; 源仓库?: string; 目标仓库?: string; 款号?: string; 色号?: string; 颜色?: string; 尺码?: string; 数量?: number; 单价?: number | null; 金额?: number | null }[] }
// ---- 退货 ----
export interface FSRLine { 色号?: string; 颜色?: string; 尺码?: string; 数量: number; 单价?: number }
export interface FSRCreate { 仓库: string; 出仓单号?: string; 客户编号?: string; 客户名称?: string; 生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 备注?: string; 明细: FSRLine[] }
export interface FSRHeader { id: number; 单号?: string; 客户名称?: string; 仓库?: string; 日期?: string; 审核?: string; 备注?: string }
export interface FSRBasisRow { 客户编号?: string; 客户名称?: string; 仓库?: string; 生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 色号?: string; 颜色?: string; 尺码?: string; 数量: number; 单价?: number }
// ---- 退仓 ----
export interface FVRLine { 色号?: string; 颜色?: string; 尺码?: string; 数量: number; 单价?: number }
export interface FVRCreate { 仓库: string; 入仓单号?: string; 供应商编号?: string; 供应商名称?: string; 生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 备注?: string; 明细: FVRLine[] }
export interface FVRHeader { id: number; 单号?: string; 供应商名称?: string; 仓库?: string; 日期?: string; 审核?: string; 备注?: string }
export interface FVRBasisRow { 供应商编号?: string; 供应商名称?: string; 仓库?: string; 生产单号?: string; 款号?: string; 款式?: string; 床号?: string; 色号?: string; 颜色?: string; 尺码?: string; 数量: number; 单价?: number }

export const finishedTransferApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<FTHeader>>("/finished-transfers", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<FTDetail>(`/finished-transfers/${enc(单号)}`).then(r => r.data),
  create: (body: FTCreate) => api.post<{ 单号: string }>("/finished-transfers", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/finished-transfers/${enc(单号)}`),
  approve: (单号: string) => api.post(`/finished-transfers/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/finished-transfers/${enc(单号)}/unapprove`),
};
export const finishedSalesReturnApi = {
  basis: (出仓单号: string) => api.get<FSRBasisRow[]>("/finished-sales-returns/basis", { params: { 出仓单号 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<FSRHeader>>("/finished-sales-returns", { params: { page, size, keyword } }).then(r => r.data),
  create: (body: FSRCreate) => api.post<{ 单号: string }>("/finished-sales-returns", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/finished-sales-returns/${enc(单号)}`),
  approve: (单号: string) => api.post(`/finished-sales-returns/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/finished-sales-returns/${enc(单号)}/unapprove`),
};
export const finishedVendorReturnApi = {
  basis: (入仓单号: string) => api.get<FVRBasisRow[]>("/finished-vendor-returns/basis", { params: { 入仓单号 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<FVRHeader>>("/finished-vendor-returns", { params: { page, size, keyword } }).then(r => r.data),
  create: (body: FVRCreate) => api.post<{ 单号: string }>("/finished-vendor-returns", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/finished-vendor-returns/${enc(单号)}`),
  approve: (单号: string) => api.post(`/finished-vendor-returns/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/finished-vendor-returns/${enc(单号)}/unapprove`),
};
