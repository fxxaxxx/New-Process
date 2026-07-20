import { api } from "./client";
import type { Paged } from "./master";

export interface MaterialDocHeader {
  id: number; 单号?: string; 日期?: string;
  数量?: number | null; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string;
  [k: string]: unknown;   // 单头特有字段(供应商/领料部门/退料部门...)按配置读取
}
export interface MaterialDocDetail {
  单头: MaterialDocHeader | null;
  明细: {
    id: number; 物料编号?: string; 物料名称?: string; 物料类别?: string;
    规格?: string; 颜色?: string; 单位?: string; 数量?: number; 单价?: number | null; 金额?: number | null; 备注?: string;
    订单单号?: string; 生产单号?: string; 款号?: string;
  }[];
}

const enc = encodeURIComponent;

export function materialDocApi(resource: string) {
  const base = `/${resource}`;
  return {
    list: (page = 1, size = 20, keyword = "") =>
      api.get<Paged<MaterialDocHeader>>(base, { params: { page, size, keyword } }).then(r => r.data),
    get: (单号: string) => api.get<MaterialDocDetail>(`${base}/${enc(单号)}`).then(r => r.data),
    create: (body: Record<string, unknown>) => api.post<{ 单号: string }>(base, body).then(r => r.data),
    remove: (单号: string) => api.delete(`${base}/${enc(单号)}`),
    approve: (单号: string) => api.post(`${base}/${enc(单号)}/approve`),
    unapprove: (单号: string) => api.post(`${base}/${enc(单号)}/unapprove`),
  };
}
