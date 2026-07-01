import { api } from "./client";
import type { Paged } from "./master";

export interface RSTLine {
  id?: number;
  原料编号?: string; 原料名称?: string; 产地?: string; 每包重量?: number | null; 单位?: string;
  系统数量?: number; 盘点数量?: number; 盈亏数量?: number; 备注?: string;
}
export interface RSTHeader {
  id: number; 单号?: string; 日期?: string; 电脑单号?: string; 操作员?: string;
  审核?: string; 审核人?: string; 备注?: string;
}
export interface RSTDetail { 单头?: RSTHeader; 明细: RSTLine[] }

const enc = encodeURIComponent;
const base = "/plastic-raw-material-stocktake";
export const plasticRawMaterialStocktakeApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<RSTHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<RSTDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
