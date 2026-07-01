import { api } from "./client";
import type { Paged } from "./master";

export interface RTNLine {
  id?: number;
  原料编号?: string; 原料名称?: string; 产地?: string; 每包重量?: number | null; 单价类型?: string;
  单位?: string; 数量?: number; 单价?: number | null; 金额?: number | null; 备注?: string;
}
export interface RTNHeader {
  id: number; 单号?: string; 供应商编号?: string; 供应商名称?: string; 日期?: string;
  电脑单号?: string; 入仓单号?: string; 单价类型?: string;
  数量?: number | null; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string;
}
export interface RTNDetail { 单头?: RTNHeader; 明细: RTNLine[] }

const enc = encodeURIComponent;
const base = "/plastic-raw-material-return";
export const plasticRawMaterialReturnApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<RTNHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<RTNDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
