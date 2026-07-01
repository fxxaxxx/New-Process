import { api } from "./client";
import type { Paged } from "./master";

export interface RSRLine {
  id?: number;
  啤机生产单号?: string; 开单日期?: string; 原料编号?: string; 原料名称?: string;
  产地?: string; 每包重量?: number | null; 单位?: string; 数量?: number; 备注?: string;
}
export interface RSRHeader {
  id: number; 单号?: string; 部门?: string; 日期?: string; 退料人?: string;
  电脑单号?: string; 操作员?: string; 数量?: number | null; 审核?: string; 审核人?: string; 备注?: string;
}
export interface RSRDetail { 单头?: RSRHeader; 明细: RSRLine[] }

const enc = encodeURIComponent;
const base = "/plastic-raw-material-stock-return";
export const plasticRawMaterialStockReturnApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<RSRHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<RSRDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
