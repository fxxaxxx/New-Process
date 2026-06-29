import { api } from "./client";
import type { Paged } from "./master";

export interface WPILine {
  id?: number;
  发外采购?: string; 生产单号?: string; 款号?: string; 物料编号?: string; 模具编号?: string;
  物料名称?: string; 颜色?: string; 用料名称?: string; 单位?: string;
  数量?: number; 备注?: string;
}
export interface WPIHeader {
  id: number; 单号?: string; 日期?: string; 领料部门?: string; 领料人?: string;
  胶箱数?: number | null; 卡板数?: number | null; 领料备注?: string; 数量?: number | null;
  操作员?: string; 电脑单号?: string; 审核?: string; 审核人?: string; 备注?: string;
}
export interface WPIDetail { 单头?: WPIHeader; 明细: WPILine[] }
export interface WPIBasisRow {
  生产单号?: string; 款号?: string; 模具编号?: string; 物料编号?: string; 物料名称?: string;
  颜色?: string; 用料名称?: string; 单位?: string;
}

const enc = encodeURIComponent;
const base = "/plastic-white-part-issue";
export const plasticWhitePartIssueApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<WPIHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
  basis: (生产单号: string) => api.get<WPIBasisRow[]>(`${base}/basis`, { params: { 生产单号 } }).then(r => r.data),
  get: (单号: string) => api.get<WPIDetail>(`${base}/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
  remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
  approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
};
