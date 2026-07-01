import { api } from "./client";
import type { Paged } from "./master";

export interface RSILine {
  id?: number;
  啤机生产单号?: string; 开单日期?: string; 啤机外发单号?: string; 原料编号?: string; 原料名称?: string;
  产地?: string; 每包重量?: number | null; 单位?: string; 数量?: number; 备注?: string;
}
export interface RSIHeader {
  id: number; 单号?: string; 生产车间?: string; 日期?: string; 电脑单号?: string;
  领料备注?: string; 制单人?: string; 操作员?: string; 数量?: number | null; 审核?: string; 审核人?: string; 备注?: string;
}
export interface RSIDetail { 单头?: RSIHeader; 明细: RSILine[] }

const enc = encodeURIComponent;
const base = "/plastic-raw-material-stock-issue";
export const plasticRawMaterialStockIssueApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<RSIHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<RSIDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
