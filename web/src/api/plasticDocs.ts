import { api } from "./client";
import type { Paged } from "./master";

export interface PlasticDocHeader {
  id: number; 单号?: string; 日期?: string; 仓库?: string; 数量?: number | null; 金额?: number | null;
  审核?: string; 备注?: string; [k: string]: unknown;
}
export interface PlasticDocLine {
  id?: number; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 仓位号?: string;
  单位?: string; 数量?: number | null; 单价?: number | null; 金额?: number | null; 备注?: string;
}
export interface PlasticDocDetail { 单头?: PlasticDocHeader; 明细: PlasticDocLine[] }

const enc = encodeURIComponent;
export function plasticDocApi(resource: string) {
  const base = `/${resource}`;
  return {
    list: (page = 1, size = 10, keyword = "") => api.get<Paged<PlasticDocHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
    get: (单号: string) => api.get<PlasticDocDetail>(`${base}/${enc(单号)}`).then(r => r.data),
    create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
    remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
    approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
    unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
  };
}
