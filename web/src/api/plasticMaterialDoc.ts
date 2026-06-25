import { api } from "./client";
import type { Paged } from "./master";

export interface PlasticOrderRow {
  ID: number; 生产单号?: string; 款号?: string; 款式?: string; 合同号?: string;
  客户名称?: string; 计划数量?: number | null; 日期?: string; 交货日期?: string; 审核?: string;
}
export interface PlasticMaterialBasisRow {
  货号?: string; 工模编号?: string; 物料编号?: string; 物料名称?: string; 颜色?: string;
  仓位号?: string; 用料名称?: string; 加工内容?: string; 加工单价?: number | null; 用量?: number | null;
}
export interface PlasticMaterialDocHeader {
  ID: number; 单号?: string; 日期?: string; 生产单号?: string; 货号?: string; 客户?: string;
  数量?: number | null; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string;
}
export interface PlasticMaterialDocLine {
  ID: number; 工模编号?: string; 物料编号?: string; 物料名称?: string; 颜色?: string; 仓位号?: string;
  用料名称?: string; 加工内容?: string; 加工单价?: number | null; 用量?: number | null;
  订购数量?: number | null; 金额?: number | null; 备注?: string;
}
export interface PlasticMaterialDocDetail { 单头?: PlasticMaterialDocHeader; 明细: PlasticMaterialDocLine[] }

export interface PlasticDocCreateLine {
  工模编号?: string; 物料编号?: string; 物料名称?: string; 颜色?: string; 仓位号?: string;
  用料名称?: string; 加工内容?: string; 加工单价?: number | null; 用量?: number | null; 订购数量: number;
}
export interface PlasticDocCreate {
  生产单号?: string; 货号?: string; 客户?: string; 备注?: string; 明细: PlasticDocCreateLine[];
}

const enc = encodeURIComponent;
export const plasticMaterialDocApi = {
  orders: (起?: string, 止?: string, keyword?: string, page = 1, size = 50) =>
    api.get<Paged<PlasticOrderRow>>("/plastic-material-docs/orders", { params: { 起, 止, keyword, page, size } }).then(r => r.data),
  basis: (生产单号: string) =>
    api.get<PlasticMaterialBasisRow[]>("/plastic-material-docs/basis", { params: { 生产单号 } }).then(r => r.data),
  create: (body: PlasticDocCreate) =>
    api.post<{ 单号: string }>("/plastic-material-docs", body).then(r => r.data),
  get: (单号: string) =>
    api.get<PlasticMaterialDocDetail>(`/plastic-material-docs/${enc(单号)}`).then(r => r.data),
  approve: (单号: string) => api.post(`/plastic-material-docs/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/plastic-material-docs/${enc(单号)}/unapprove`),
  remove: (单号: string) => api.delete(`/plastic-material-docs/${enc(单号)}`),
};
