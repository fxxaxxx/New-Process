import { api } from "./client";
import type { Paged } from "./master";

export interface RMDLine {
  id?: number;
  原料编号?: string; 原料名称?: string; 每包重量?: number | null; 单位?: string;
  需求数量KG?: number; 需求数量包?: number; 备注?: string;
}
export interface RMDHeader {
  id: number; 单号?: string; 啤机生产单号?: string; 开单日期?: string; 制单人?: string;
  领料备注?: string; 生产车间?: string; 操作员?: string;
  数量KG?: number | null; 数量包?: number | null; 审核?: string; 审核人?: string; 备注?: string;
}
export interface RMDDetail { 单头?: RMDHeader; 明细: RMDLine[] }

const enc = encodeURIComponent;
const base = "/plastic-raw-material-demand";
export const plasticRawMaterialDemandApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<RMDHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<RMDDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
