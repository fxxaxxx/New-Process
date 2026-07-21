import { api } from "./client";
import type { Paged } from "./master";
import type { SemiFinishedLabelProductQuery, SemiFinishedLabelProductRow } from "./semiFinishedLabelOrders";

// ---- 入仓 ----
export interface SRLine { 订单单号?: string; 配件编号?: string; 客户?: string; 产品货号?: string; 产品名称?: string; 产品装配名称?: string; 生产单号?: string; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string; 数量: number; 单价?: number; 备注?: string }
export interface SRCreate { 日期?: string; 订单单号?: string; 仓库: string; 生产单号?: string; 款号?: string; 供应商编号?: string; 供应商名称?: string; 部门?: string; 备注?: string; 明细: SRLine[] }
export interface SRHeader { id: number; 单号?: string; 订单单号?: string; 供应商编号?: string; 供应商名称?: string; 部门?: string; 生产单号?: string; 款号?: string; 仓库?: string; 日期?: string; 数量?: number; 金额?: number | null; 操作员?: string; 审核?: string; 备注?: string }
export interface SRDetail { 单头: SRHeader | null; 明细: (SRLine & { id: number; 金额?: number | null })[] }

// ---- 领料（半成品出库单 · 自由选产品版）----
export interface SIProductRow { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 加工单价?: number | null; 库存单价?: number | null }
export interface SILineInput { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 数量: number; 备注?: string | null }
export interface SILineRow { ID?: number; 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 规格?: string | null; 颜色?: string | null; 单位?: string | null; 数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string | null }
export interface SICreate { 日期?: string; 仓库: string; 部门?: string | null; 领料人?: string | null; 拉长?: string | null; 收件人?: string | null; 领料备注?: string | null; 件数?: number | null; 卡板数?: number | null; 制单人?: string | null; 备注?: string | null; 明细: SILineInput[] }
export interface SIHeader { ID?: number; id?: number; 单号?: string; 仓库?: string; 部门?: string | null; 领料人?: string | null; 拉长?: string | null; 收件人?: string | null; 领料备注?: string | null; 件数?: number | null; 卡板数?: number | null; 制单人?: string | null; 日期?: string; 审核日期?: string | null; 数量?: number | null; 金额?: number | null; 操作员?: string | null; 审核?: string; 审核人?: string | null; 备注?: string | null }
export interface SIDetail { 单头: SIHeader | null; 明细: SILineRow[] }

// ---- 盘点（自由选产品版）----
export interface STKBasisRow { 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string | null; 系统数量: number }
export interface STKProductRow { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 加工单价?: number | null; 库存单价?: number | null }
export interface STKLineInput { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 系统数量: number; 盘点数量: number; 备注?: string | null }
export interface STKLineRow { ID?: number; 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 系统数量?: number | null; 盘点数量?: number | null; 盈亏数量?: number | null; 备注?: string | null }
export interface STKCreate { 日期?: string; 仓库: string; 备注?: string | null; 明细: STKLineInput[] }
export interface STKHeader { ID?: number; id?: number; 单号?: string; 仓库?: string; 日期?: string; 系统数量?: number | null; 盘点数量?: number | null; 盈亏数量?: number | null; 操作员?: string | null; 审核?: string; 审核人?: string | null; 备注?: string | null }
export interface STKDetail { 单头: STKHeader | null; 明细: STKLineRow[] }

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
  get: (单号: string) => api.get<SIDetail>(`/semi-issues/${enc(单号)}`).then(r => r.data),
  create: (body: SICreate) => api.post<{ 单号: string }>("/semi-issues", body).then(r => r.data),
  update: (单号: string, body: SICreate) => api.put<SIDetail>(`/semi-issues/${enc(单号)}`, body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-issues/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-issues/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-issues/${enc(单号)}/unapprove`),
  products: (params: { page?: number; size?: number; field?: string; keyword?: string; exact?: boolean } = {}) =>
    api.get<Paged<SIProductRow>>("/semi-issues/products", { params }).then(r => r.data),
  adjacent: (单号: string, next: boolean) =>
    api.get<SIDetail | undefined>(`/semi-issues/${enc(单号)}/adjacent`, { params: { next } })
      .then(r => r.status === 204 ? undefined : r.data),
};
export const semiStocktakeApi = {
  basis: (仓库: string) => api.get<STKBasisRow[]>("/semi-stocktakes/basis", { params: { 仓库 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<STKHeader>>("/semi-stocktakes", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<STKDetail>(`/semi-stocktakes/${enc(单号)}`).then(r => r.data),
  create: (body: STKCreate) => api.post<{ 单号: string }>("/semi-stocktakes", body).then(r => r.data),
  update: (单号: string, body: STKCreate) => api.put<STKDetail>(`/semi-stocktakes/${enc(单号)}`, body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-stocktakes/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-stocktakes/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-stocktakes/${enc(单号)}/unapprove`),
  products: (params: { page?: number; size?: number; field?: string; keyword?: string; exact?: boolean } = {}) =>
    api.get<Paged<STKProductRow>>("/semi-stocktakes/products", { params }).then(r => r.data),
  adjacent: (单号: string, next: boolean) =>
    api.get<STKDetail | undefined>(`/semi-stocktakes/${enc(单号)}/adjacent`, { params: { next } })
      .then(r => r.status === 204 ? undefined : r.data),
};
export interface SemiInvReportRow { 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 库存数量: number; 仓库位置?: string | null }
export interface SemiInvReportQuery { 仓库?: string; field?: string; keyword?: string; exact?: boolean; includeZero?: boolean; showAll?: boolean }
export interface SemiMonthlyRow { 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 期初库存: number; 本期入库: number; 本期出库: number; 本期报废: number; 盘点盈亏: number; 期末库存: number }
export interface SemiMonthlyQuery { 起日期?: string; 止日期?: string; 仓库?: string; field?: string; keyword?: string; exact?: boolean }
export interface SemiLabelSummaryRow { 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 数量: number; 每箱数量?: number | null; 预计标签数: number; 实需标签数: number }
export interface SemiLabelDetailRow { 日期: string; 单号?: string | null; 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 数量: number; 每箱数量?: number | null; 预计标签数: number; 实需标签数: number; 备注?: string | null; 审核?: string | null }
export interface SemiLabelQueryParams { 起日期?: string; 止日期?: string; field?: string; keyword?: string; exact?: boolean; 审核?: string; materialOnly?: boolean }
export const semiLabelQueryApi = {
  summary: (params: SemiLabelQueryParams = {}) => api.get<SemiLabelSummaryRow[]>("/semi-label-query/summary", { params }).then(r => r.data),
  detail: (params: SemiLabelQueryParams = {}) => api.get<SemiLabelDetailRow[]>("/semi-label-query/detail", { params }).then(r => r.data),
};
export interface SemiReceiptSummaryRow { 配件编号?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 供应商编号?: string | null; 供应商名称?: string | null; 入仓数量: number }
export interface SemiReceiptDetailRow { 日期?: string | null; 单号?: string | null; 入库单号?: string | null; 订单单号?: string | null; 供应商编号?: string | null; 供应商名称?: string | null; 生产单号?: string | null; 配件编号?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 数量: number; 备注?: string | null; 审核?: string | null }
export interface SemiReceiptQueryParams { 起日期?: string; 止日期?: string; field?: string; keyword?: string; exact?: boolean; 审核?: string; materialOnly?: boolean; bySupplier?: boolean }
export const semiReceiptQueryApi = {
  summary: (params: SemiReceiptQueryParams = {}) => api.get<SemiReceiptSummaryRow[]>("/semi-receipt-query/summary", { params }).then(r => r.data),
  detail: (params: SemiReceiptQueryParams = {}) => api.get<SemiReceiptDetailRow[]>("/semi-receipt-query/detail", { params }).then(r => r.data),
};
export const semiInventoryApi = {
  list: (仓库: string) => api.get<SemiStockRow[]>("/semi-inventory", { params: { 仓库 } }).then(r => r.data),
  report: (params: SemiInvReportQuery = {}) => api.get<SemiInvReportRow[]>("/semi-inventory/report", { params }).then(r => r.data),
  monthly: (params: SemiMonthlyQuery = {}) => api.get<SemiMonthlyRow[]>("/semi-inventory/monthly", { params }).then(r => r.data),
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

// ---- 半成品退库单（无价 · 自由选产品版）----
export interface SSRProductRow { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 加工单价?: number | null; 库存单价?: number | null }
export interface SSRLineInput { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 数量: number; 备注?: string | null }
export interface SSRLineRow { ID?: number; 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 规格?: string | null; 颜色?: string | null; 单位?: string | null; 数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string | null }
export interface SSRCreate { 日期?: string; 仓库: string; 部门?: string | null; 退料人?: string | null; 备注?: string | null; 明细: SSRLineInput[] }
export interface SSRHeader { ID?: number; id?: number; 单号?: string; 仓库?: string; 部门?: string | null; 退料人?: string | null; 日期?: string; 审核日期?: string | null; 数量?: number | null; 金额?: number | null; 操作员?: string | null; 审核?: string; 审核人?: string | null; 备注?: string | null }
export interface SSRDetail { 单头: SSRHeader | null; 明细: SSRLineRow[] }

export const semiStockReturnApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SSRHeader>>("/semi-stock-returns", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SSRDetail>(`/semi-stock-returns/${enc(单号)}`).then(r => r.data),
  create: (body: SSRCreate) => api.post<{ 单号: string }>("/semi-stock-returns", body).then(r => r.data),
  update: (单号: string, body: SSRCreate) => api.put<SSRDetail>(`/semi-stock-returns/${enc(单号)}`, body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-stock-returns/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-stock-returns/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-stock-returns/${enc(单号)}/unapprove`),
  products: (params: { page?: number; size?: number; field?: string; keyword?: string; exact?: boolean } = {}) =>
    api.get<Paged<SSRProductRow>>("/semi-stock-returns/products", { params }).then(r => r.data),
  adjacent: (单号: string, next: boolean) =>
    api.get<SSRDetail | undefined>(`/semi-stock-returns/${enc(单号)}/adjacent`, { params: { next } })
      .then(r => r.status === 204 ? undefined : r.data),
};

// ---- 半成品报废单（无价 · 自由选产品版，库存 -）----
export interface SSProductRow { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 加工单价?: number | null; 库存单价?: number | null }
export interface SSLineInput { 配件编号: string; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 数量: number; 备注?: string | null }
export interface SSLineRow { ID?: number; 配件编号?: string | null; 客户?: string | null; 产品货号?: string | null; 产品名称?: string | null; 产品装配名称?: string | null; 生产单号?: string | null; 规格?: string | null; 颜色?: string | null; 单位?: string | null; 数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string | null }
export interface SSCreateDoc { 日期?: string; 仓库: string; 部门?: string | null; 报废人?: string | null; 备注?: string | null; 明细: SSLineInput[] }
export interface SSDocHeader { ID?: number; id?: number; 单号?: string; 仓库?: string; 部门?: string | null; 报废人?: string | null; 日期?: string; 审核日期?: string | null; 数量?: number | null; 金额?: number | null; 操作员?: string | null; 审核?: string; 审核人?: string | null; 备注?: string | null }
export interface SSDocDetail { 单头: SSDocHeader | null; 明细: SSLineRow[] }

export const semiScrapApi = {
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<SSDocHeader>>("/semi-scraps", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<SSDocDetail>(`/semi-scraps/${enc(单号)}`).then(r => r.data),
  create: (body: SSCreateDoc) => api.post<{ 单号: string }>("/semi-scraps", body).then(r => r.data),
  update: (单号: string, body: SSCreateDoc) => api.put<SSDocDetail>(`/semi-scraps/${enc(单号)}`, body).then(r => r.data),
  remove: (单号: string) => api.delete(`/semi-scraps/${enc(单号)}`),
  approve: (单号: string) => api.post(`/semi-scraps/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/semi-scraps/${enc(单号)}/unapprove`),
  products: (params: { page?: number; size?: number; field?: string; keyword?: string; exact?: boolean } = {}) =>
    api.get<Paged<SSProductRow>>("/semi-scraps/products", { params }).then(r => r.data),
  adjacent: (单号: string, next: boolean) =>
    api.get<SSDocDetail | undefined>(`/semi-scraps/${enc(单号)}/adjacent`, { params: { next } })
      .then(r => r.status === 204 ? undefined : r.data),
};
