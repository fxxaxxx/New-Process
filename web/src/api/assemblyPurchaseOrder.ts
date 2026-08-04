import { api } from "./client";
import type { Paged } from "./master";
import type { AssemblyPurchaseOrderDetail } from "./assemblyPurchaseQuery";

export interface AssemblyPurchaseOrderHeaderRow {
  id: number;
  单号?: string; 日期?: string;
  供应商编号?: string; 供应商名称?: string;
  客户编号?: string; 客户名称?: string;
  收货仓库?: string; 电脑单号?: string; 装配方式?: string;
  开始交货日期?: string; 每天交货?: number | null; 完成日期?: string;
  收货人?: string; 单价?: number | null; 数量?: number | null; 金额?: number | null;
  操作员?: string; 审核?: string; 审核人?: string; 审核日期?: string; 备注?: string;
}

export interface AssemblyPurchaseOrderSaveProductionLine {
  接单日期?: string; 生产单号?: string; 款号?: string; 产品名称?: string;
  配件编号?: string; 产品装配名称?: string;
  加工数量?: number | null; 单价?: number | null;
}

export interface AssemblyPurchaseOrderSaveMaterialLine {
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string;
  单位?: string; 用量?: number | null; 需求数量?: number | null;
  单价?: number | null; 备注?: string;
}

export interface AssemblyPurchaseOrderSave {
  供应商编号?: string; 供应商名称?: string;
  客户编号?: string; 客户名称?: string;
  出单日期?: string; 收货仓库?: string; 电脑单号?: string; 装配方式?: string;
  开始交货日期?: string; 每天交货?: number | null; 完成日期?: string;
  收货人?: string; 单价?: number | null; 备注?: string;
  生产明细: AssemblyPurchaseOrderSaveProductionLine[];
  物料明细: AssemblyPurchaseOrderSaveMaterialLine[];
}

const enc = encodeURIComponent;
const base = "/assembly-purchase-orders";
export const assemblyPurchaseOrderApi = {
  list: (page = 1, size = 50, keyword = "") =>
    api.get<Paged<AssemblyPurchaseOrderHeaderRow>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<AssemblyPurchaseOrderDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: AssemblyPurchaseOrderSave) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  update: (单号: string, body: AssemblyPurchaseOrderSave) => api.put(`${base}/${enc(单号)}`, body),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
