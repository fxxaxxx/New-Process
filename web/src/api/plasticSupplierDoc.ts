import { api } from "./client";
import type { Paged } from "./master";

export interface PSDLine {
  id?: number;
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string;
  塑胶货号?: string; 仓位号?: string; 单位?: string; 数量?: number; 单价?: number | null; 金额?: number | null; 备注?: string;
}
export interface PSDHeader {
  id: number; 单号?: string; 日期?: string; 供应商编号?: string; 供应商名称?: string; 仓库?: string;
  数量?: number | null; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string;
  出库单号?: string; 入仓单号?: string; 电脑单号?: string;
}
export interface PSDDetail { 单头?: PSDHeader; 明细: PSDLine[] }

const enc = encodeURIComponent;
export function plasticSupplierDocApi(resource: string) {
  const base = `/${resource}`;
  return {
    list: (page = 1, size = 10, keyword = "") => api.get<Paged<PSDHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
    get: (单号: string) => api.get<PSDDetail>(`${base}/${enc(单号)}`).then(r => r.data),
    create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
    remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
    approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
    unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
  };
}
