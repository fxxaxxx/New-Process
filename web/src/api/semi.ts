import { api } from "./client";
import type { Paged } from "./master";

// ---- 入仓 ----
export interface SRLine { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量: number; 单价?: number }
export interface SRCreate { 仓库: string; 生产单号?: string; 款号?: string; 供应商编号?: string; 供应商名称?: string; 部门?: string; 备注?: string; 明细: SRLine[] }
export interface SRHeader { id: number; 单号?: string; 仓库?: string; 日期?: string; 数量?: number; 金额?: number | null; 审核?: string; 备注?: string }
export interface SRDetail { 单头: SRHeader | null; 明细: { id: number; 生产单号?: string; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量?: number; 单价?: number | null; 金额?: number | null }[] }

// ---- 领料 ----
export interface SILine { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量: number; 单价?: number }
export interface SICreate { 仓库: string; 生产单号?: string; 款号?: string; 部门?: string; 领料人?: string; 备注?: string; 明细: SILine[] }
export interface SIHeader { id: number; 单号?: string; 仓库?: string; 部门?: string; 领料人?: string; 日期?: string; 数量?: number; 金额?: number | null; 审核?: string; 备注?: string }

// ---- 盘点 ----
export interface SSBasisRow { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 系统数量: number }
export interface SSLine { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 系统数量: number; 盘点数量: number }
export interface SSCreate { 仓库: string; 备注?: string; 明细: SSLine[] }
export interface SSHeader { id: number; 单号?: string; 仓库?: string; 日期?: string; 审核?: string; 备注?: string }

// ---- 库存 ----
export interface SemiStockRow { 物料编号: string; 物料名称?: string; 规格?: string; 颜色?: string; 库存: number }

const enc = encodeURIComponent;
export const semiReceiptApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SRHeader>>("/semi-receipts", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SRDetail>(`/semi-receipts/${enc(单号)}`).then(r => r.data),
  create: (body: SRCreate) => api.post<{ 单号: string }>("/semi-receipts", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-receipts/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-receipts/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-receipts/${enc(单号)}/unapprove`),
};
export const semiIssueApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SIHeader>>("/semi-issues", { params: { page, size, keyword } }).then(r => r.data),
  create: (body: SICreate) => api.post<{ 单号: string }>("/semi-issues", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-issues/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-issues/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-issues/${enc(单号)}/unapprove`),
};
export const semiStocktakeApi = {
  basis: (仓库: string) => api.get<SSBasisRow[]>("/semi-stocktakes/basis", { params: { 仓库 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SSHeader>>("/semi-stocktakes", { params: { page, size, keyword } }).then(r => r.data),
  create: (body: SSCreate) => api.post<{ 单号: string }>("/semi-stocktakes", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-stocktakes/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-stocktakes/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-stocktakes/${enc(单号)}/unapprove`),
};
export const semiInventoryApi = {
  list: (仓库: string) => api.get<SemiStockRow[]>("/semi-inventory", { params: { 仓库 } }).then(r => r.data),
};
