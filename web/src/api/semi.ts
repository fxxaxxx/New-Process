import { api } from "./client";
import type { Paged } from "./master";
import type { SemiFinishedLabelProductQuery, SemiFinishedLabelProductRow } from "./semiFinishedLabelOrders";

// ---- 入仓 ----
export interface SRLine { 订单单号?: string; 配件编号?: string; 客户?: string; 产品货号?: string; 产品名称?: string; 产品装配名称?: string; 生产单号?: string; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量: number; 单价?: number; 备注?: string }
export interface SRCreate { 日期?: string; 订单单号?: string; 仓库: string; 生产单号?: string; 款号?: string; 供应商编号?: string; 供应商名称?: string; 部门?: string; 备注?: string; 明细: SRLine[] }
export interface SRHeader { id: number; 单号?: string; 订单单号?: string; 供应商编号?: string; 供应商名称?: string; 部门?: string; 生产单号?: string; 款号?: string; 仓库?: string; 日期?: string; 数量?: number; 金额?: number | null; 操作员?: string; 审核?: string; 备注?: string }
export interface SRDetail { 单头: SRHeader | null; 明细: (SRLine & { id: number; 金额?: number | null })[] }

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

// ---- 半成品退仓 ----
export interface SWRHeader { id: number; 单号: string; 入仓单号: string; 日期: string; 供应商编号?: string; 供应商名称?: string; 仓库: string; 数量: number; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string }
export interface SWRProductRow { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 加工单价?: number | null; 库存单价?: number | null }
export interface SWRLine { ID?: number; 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 数量: number; 单价?: number | null; 金额?: number | null; 备注?: string | null }
export interface SWRDetail { 单头: SWRHeader; 明细: SWRLine[] }
export interface SWRCreate { 入仓单号: string; 日期: string; 供应商编号?: string; 供应商名称?: string; 仓库: string; 备注?: string; 明细: { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 数量: number; 备注?: string | null }[] }

const enc = encodeURIComponent;
export const semiReceiptApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SRHeader>>("/semi-receipts", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SRDetail>(`/semi-receipts/${enc(单号)}`).then(r => r.data),
  create: (body: SRCreate) => api.post<{ 单号: string }>("/semi-receipts", body).then(r => r.data),
  update: (单号: string, body: SRCreate) => api.put<SRDetail>(`/semi-receipts/${enc(单号)}`, body).then(r => r.data),
  adjacent: (单号: string, direction: "previous" | "next") => api.get<SRDetail | undefined>(`/semi-receipts/${enc(单号)}/adjacent`, { params: { direction } }).then(r => r.status === 204 ? undefined : r.data),
  products: (params: SemiFinishedLabelProductQuery = {}) => api.get<Paged<SemiFinishedLabelProductRow>>("/semi-receipts/products", { params }).then(r => r.data),
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
export const semiWarehouseReturnApi = {
  list: (page = 1, size = 100, keyword = "") => api.get<Paged<SWRHeader>>("/semi-warehouse-returns", { params: { page, size, keyword } }).then(r => r.data),
  receipts: (page = 1, size = 100, keyword = "") => api.get<Paged<SRHeader>>("/semi-warehouse-returns/receipts", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SWRDetail>(`/semi-warehouse-returns/${enc(单号)}`).then(r => r.data),
  create: (body: SWRCreate) => api.post<{ 单号: string }>("/semi-warehouse-returns", body).then(r => r.data),
  update: (单号: string, body: SWRCreate) => api.put<SWRDetail>(`/semi-warehouse-returns/${enc(单号)}`, body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-warehouse-returns/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-warehouse-returns/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-warehouse-returns/${enc(单号)}/unapprove`),
  products: (params: { page?: number; size?: number; field?: string; keyword?: string; exact?: boolean } = {}) =>
    api.get<Paged<SWRProductRow>>("/semi-warehouse-returns/products", { params }).then(r => r.data),
  adjacent: (单号: string, next: boolean) =>
    api.get<SWRDetail | undefined>(`/semi-warehouse-returns/${enc(单号)}/adjacent`, { params: { next } })
      .then(r => r.status === 204 ? undefined : r.data),
};
