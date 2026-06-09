import { api } from "./client";
import type { Paged } from "./master";

// ---- 销售出货 ----
export interface SSLine { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量: number; 单价?: number }
export interface SSCreate { 仓库: string; 客户编号?: string; 客户名称?: string; 付款方式?: string; 备注?: string; 明细: SSLine[] }
export interface SSHeader { id: number; 单号?: string; 客户编号?: string; 客户名称?: string; 付款方式?: string; 仓库?: string; 日期?: string; 数量?: number; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string }
export interface SSDetail { 单头: SSHeader | null; 明细: { id: number; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量?: number; 库存单价?: number | null; 库存金额?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string }[] }

// ---- 销售退货 ----
export interface SRLine { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量: number; 单价?: number }
export interface SRCreate { 仓库: string; 销售单号?: string; 客户编号?: string; 客户名称?: string; 备注?: string; 明细: SRLine[] }
export interface SRHeader { id: number; 单号?: string; 销售单号?: string; 客户编号?: string; 客户名称?: string; 仓库?: string; 日期?: string; 数量?: number; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string }
export interface SRDetail { 单头: SRHeader | null; 明细: { id: number; 销售单号?: string; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量?: number; 库存单价?: number | null; 库存金额?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string }[] }
export interface SRBasisRow { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量: number; 单价?: number | null }

// ---- 销售收款 ----
export interface SKLine { 客户编号?: string; 客户名称?: string; 收款金额: number; 货款金额?: number; 应收金额?: number; 出仓单号?: string }
export interface SKCreate { 出仓单号?: string; 备注?: string; 明细: SKLine[] }
export interface SKHeader { id: number; 单号?: string; 出仓单号?: string; 日期?: string; 金额?: number | null; 审核?: string; 审核人?: string; 备注?: string }
export interface SKDetail { 单头: SKHeader | null; 明细: { id: number; 客户编号?: string; 客户名称?: string; 货款金额?: number | null; 收款金额?: number | null; 应收金额?: number | null; 备注?: string }[] }

// ---- 应收对账 ----
export interface ReceivableRow { 客户编号?: string; 客户名称?: string; 出货金额: number; 收款金额: number; 退货金额: number; 应收余额: number }
export interface ReceivableSettlementRow { 出货单号?: string; 出货日期?: string; 客户编号?: string; 客户名称?: string; 应收金额: number; 退货金额: number; 已收金额: number; 未核销余额: number }
export interface ReceivableAgingRow { 客户编号?: string; 客户名称?: string; 账龄0_30: number; 账龄31_60: number; 账龄61_90: number; "账龄90以上": number; 合计: number }
export interface UnsettledShipmentRow { 出货单号?: string; 出货日期?: string; 应收金额: number; 已收金额: number; 未核销余额: number }

const enc = encodeURIComponent;
export const salesShipmentApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SSHeader>>("/sales-shipments", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SSDetail>(`/sales-shipments/${enc(单号)}`).then(r => r.data),
  create: (body: SSCreate) => api.post<{ 单号: string }>("/sales-shipments", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/sales-shipments/${enc(单号)}`),
  approve: (单号: string) => api.post(`/sales-shipments/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/sales-shipments/${enc(单号)}/unapprove`),
};
export const salesReturnApi = {
  basis: (销售单号: string) => api.get<SRBasisRow[]>("/sales-returns/basis", { params: { 销售单号 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SRHeader>>("/sales-returns", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SRDetail>(`/sales-returns/${enc(单号)}`).then(r => r.data),
  create: (body: SRCreate) => api.post<{ 单号: string }>("/sales-returns", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/sales-returns/${enc(单号)}`),
  approve: (单号: string) => api.post(`/sales-returns/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/sales-returns/${enc(单号)}/unapprove`),
};
export const salesReceiptApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SKHeader>>("/sales-receipts", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SKDetail>(`/sales-receipts/${enc(单号)}`).then(r => r.data),
  create: (body: SKCreate) => api.post<{ 单号: string }>("/sales-receipts", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/sales-receipts/${enc(单号)}`),
  approve: (单号: string) => api.post(`/sales-receipts/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/sales-receipts/${enc(单号)}/unapprove`),
};
export const receivablesApi = {
  list: (客户编号?: string) => api.get<ReceivableRow[]>("/receivables", { params: { 客户编号 } }).then(r => r.data),
  settlement: (客户编号?: string, 仅未结清?: boolean) =>
    api.get<ReceivableSettlementRow[]>("/receivables/settlement", { params: { 客户编号, 仅未结清 } }).then(r => r.data),
  aging: (客户编号?: string, 基准日?: string) =>
    api.get<ReceivableAgingRow[]>("/receivables/aging", { params: { 客户编号, 基准日 } }).then(r => r.data),
  unsettled: (客户编号: string) =>
    api.get<UnsettledShipmentRow[]>("/receivables/unsettled", { params: { 客户编号 } }).then(r => r.data),
};
