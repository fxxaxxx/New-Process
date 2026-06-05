import { api } from "./client";
import type { Paged } from "./master";

export interface CuttingLine { 扎号?: number; 缸号?: string; 颜色?: string; 尺码?: string; 数量: number; 计件数量?: number }
export interface CuttingCreate {
  生产单号: string; 款号?: string; 款式?: string; 客户编号?: string; 客户名称?: string;
  加工厂编号?: string; 加工厂名称?: string; 床号?: string; 布种?: string; 备注?: string;
  明细: CuttingLine[];
}
export interface CuttingHeader {
  id: number; 裁床单号?: string; 生产单号?: string; 款号?: string; 款式?: string;
  客户名称?: string; 加工厂名称?: string; 日期?: string; 床号?: string; 裁床数量?: number; 布种?: string; 审核?: string; 备注?: string;
}
export interface CuttingDetail {
  单头: CuttingHeader | null;
  明细: { id: number; 扎号?: number; 缸号?: string; 颜色?: string; 尺码?: string; 数量?: number; 计件数量?: number; 备注?: string }[];
}

const enc = encodeURIComponent;
export const cuttingsApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<CuttingHeader>>("/cuttings", { params: { page, size, keyword } }).then(r => r.data),
  get: (裁床单号: string) => api.get<CuttingDetail>(`/cuttings/${enc(裁床单号)}`).then(r => r.data),
  create: (body: CuttingCreate) => api.post<{ 裁床单号: string }>("/cuttings", body).then(r => r.data),
  remove: (裁床单号: string) => api.delete(`/cuttings/${enc(裁床单号)}`),
  approve: (裁床单号: string) => api.post(`/cuttings/${enc(裁床单号)}/approve`),
  unapprove: (裁床单号: string) => api.post(`/cuttings/${enc(裁床单号)}/unapprove`),
};
