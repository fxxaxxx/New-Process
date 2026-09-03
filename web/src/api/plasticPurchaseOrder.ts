import { api } from "./client";
import type { Paged } from "./master";

export interface PPOLine {
  id?: number;
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string; 模具编号?: string;
  用量?: number | null; 套数?: number | null; 数量?: number; 颜色?: string; 色粉号?: string; 用料名称?: string; 备注?: string;
  // 详情/进度带出:已审核入仓数量 与 欠数=订购−入仓(新建录入行无此二值)
  入仓数量?: number | null; 欠数?: number | null;
}
export interface PPOHeader {
  id: number; 单号?: string; 日期?: string; 交货日期?: string; 供应商编号?: string; 供应商名称?: string;
  客户名称?: string; 交货地点?: string; 编号?: string; 数量?: number | null; 操作员?: string;
  审核?: string; 审核人?: string; 备注?: string;
}
export interface PPODetail { 单头?: PPOHeader; 明细: PPOLine[] }
export interface PPOBasisRow {
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string; 模具编号?: string;
  用量?: number | null; 套数?: number | null; 颜色?: string; 色粉号?: string; 用料名称?: string;
  // 生产制单带出:计划数量(默认订购数量=计划数量×用量)/合同号(自动填入表头 编号)
  计划数量?: number | null; 合同号?: string;
  // 该生产单下此物料(含颜色匹配)已累计下单的数量，>0 即"已下单"（防重复下单）
  已订数量?: number | null;
}

const enc = encodeURIComponent;
const base = "/plastic-purchase-orders";
export const plasticPurchaseOrderApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<PPOHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  basis: (生产单号: string) => api.get<PPOBasisRow[]>(`${base}/basis`, { params: { 生产单号 } }).then(r => r.data),
  get: (单号: string) => api.get<PPODetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
