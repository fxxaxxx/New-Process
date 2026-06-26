import { api } from "./client";
import type { Paged } from "./master";

export interface PILine {
  id?: number;
  装配采购?: string; 生产单号?: string; 款号?: string;
  物料编号?: string; 模具编号?: string; 物料名称?: string; 规格?: string; 颜色?: string;
  色粉号?: string; 用料名称?: string; 仓位号?: string; 单位?: string; 数量?: number; 备注?: string;
}
export interface PIHeader {
  id: number; 单号?: string; 日期?: string; 领料部门?: string; 领料人?: string; 仓库?: string;
  数量?: number | null; 金额?: number | null; 操作员?: string; 审核?: string; 审核人?: string; 备注?: string;
  胶箱数?: number | null; 纸箱数?: number | null; 钙塑箱数?: number | null; 卡板数?: number | null;
  收件人?: string; 电脑单号?: string; 领料备注?: string;
}
export interface PIDetail { 单头?: PIHeader; 明细: PILine[] }

const enc = encodeURIComponent;
export const plasticIssueApi = {
  list: (page = 1, size = 10, keyword = "") => api.get<Paged<PIHeader>>("/plastic-issues", { params: { page, size, keyword } }).then(r => r.data),
  get: (单号: string) => api.get<PIDetail>(`/plastic-issues/${enc(单号)}`).then(r => r.data),
  create: (body: Record<string, unknown>) => api.post<{ 单号: string }>("/plastic-issues", body).then(r => r.data),
  remove: (单号: string) => api.delete(`/plastic-issues/${enc(单号)}`),
  approve: (单号: string) => api.post(`/plastic-issues/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/plastic-issues/${enc(单号)}/unapprove`),
};
