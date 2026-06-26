import { api } from "./client";
import type { Paged } from "./master";

export interface PSBasisRow { 物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string; 仓位号?: string; 系统数量: number }
export interface PSLine { 物料编号?: string; 物料名称?: string; 规格?: string; 仓位号?: string; 单位?: string; 系统数量: number; 盘点数量: number }
export interface PSCreate { 仓库: string; 备注?: string; 明细: PSLine[] }
export interface PSHeader { id: number; 单号?: string; 仓库?: string; 日期?: string; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string }

const enc = encodeURIComponent;
export const plasticStocktakeApi = {
  basis: (仓库: string) => api.get<PSBasisRow[]>("/plastic-stocktakes/basis", { params: { 仓库 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") => api.get<Paged<PSHeader>>("/plastic-stocktakes", { params: { page, size, keyword } }).then(r => r.data),
  create: (body: PSCreate) => api.post<{ 单号: string }>("/plastic-stocktakes", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/plastic-stocktakes/${enc(单号)}`),
  approve: (单号: string) => api.post(`/plastic-stocktakes/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/plastic-stocktakes/${enc(单号)}/unapprove`),
};
