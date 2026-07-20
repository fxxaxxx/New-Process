import { api } from "./client";
import type { Paged } from "./master";

export interface MSBasisRow { 物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string; 系统数量: number }
export interface MSLine { 物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string; 系统数量: number; 盘点数量: number }
export interface MSCreate { 日期?: string; 仓库: string; 备注?: string; 明细: MSLine[] }
export interface MSHeader { id: number; 单号?: string; 仓库?: string; 日期?: string; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string }
export interface MSLineRow {
  id: number; 物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string;
  系统数量?: number | null; 盘点数量?: number | null; 盈亏数量?: number | null;
}
export interface MSDetail { 单头?: MSHeader; 明细: MSLineRow[] }

const enc = encodeURIComponent;
export const materialStocktakeApi = {
  basis: (仓库: string) => api.get<MSBasisRow[]>("/material-stocktakes/basis", { params: { 仓库 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<MSHeader>>("/material-stocktakes", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<MSDetail>(`/material-stocktakes/${enc(单号)}`).then(r => r.data),
  create: (body: MSCreate) => api.post<{ 单号: string }>("/material-stocktakes", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/material-stocktakes/${enc(单号)}`),
  approve: (单号: string) => api.post(`/material-stocktakes/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/material-stocktakes/${enc(单号)}/unapprove`),
};
