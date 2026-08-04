import { api } from "./client";
import type { Paged } from "./master";

export interface PlasticLabelOrderLine {
  ID?: number;
  物料编号: string;
  物料名称?: string | null;
  规格?: string | null;
  颜色?: string | null;
  单位?: string | null;
  数量: number;
  标签数: number;
  备注?: string | null;
}

export interface PlasticLabelOrderSave {
  日期: string;
  备注一?: string | null;
  备注二?: string | null;
  明细: PlasticLabelOrderLine[];
}

export interface PlasticLabelOrder extends PlasticLabelOrderSave {
  ID: number;
  电脑单号?: string;
  操作员?: string;
  审核?: string;
  审核人?: string | null;
  审核时间?: string | null;
}

export interface PlasticLabelOrderListRow {
  ID: number;
  电脑单号: string;
  日期: string;
  操作员: string;
  审核: string;
  审核人: string | null;
  审核时间: string | null;
  备注一: string | null;
  备注二: string | null;
}

export interface PlasticLabelMaterialRow {
  物料编号: string;
  物料名称?: string | null;
  规格?: string | null;
  颜色?: string | null;
  单位?: string | null;
  单价?: number | null;
}

export interface PlasticLabelMaterialQuery {
  page?: number;
  size?: number;
  field?: string;
  keyword?: string;
  exact?: boolean;
}

export type AdjacentDirection = "previous" | "next";

const base = "/plastic-label-orders";
const enc = encodeURIComponent;

export const plasticLabelOrdersApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<PlasticLabelOrderListRow>>(base, { params: { page, size, keyword } })
      // 后端按 camelCase 序列化为 id，这里归一化为 ID（与全项目调用方一致）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
  get: (电脑单号: string) => api.get<PlasticLabelOrder>(`${base}/${enc(电脑单号)}`).then(r => r.data),
  create: (body: PlasticLabelOrderSave) => api.post<{ 电脑单号: string }>(base, body).then(r => r.data),
  update: (电脑单号: string, body: PlasticLabelOrderSave) =>
    api.put<PlasticLabelOrder>(`${base}/${enc(电脑单号)}`, body).then(r => r.data),
  remove: (电脑单号: string) => api.delete(`${base}/${enc(电脑单号)}`),
  audit: (电脑单号: string) => api.post(`${base}/${enc(电脑单号)}/audit`),
  reverseAudit: (电脑单号: string) => api.post(`${base}/${enc(电脑单号)}/reverse-audit`),
  adjacent: (电脑单号: string, direction: AdjacentDirection) =>
    api.get<PlasticLabelOrder | undefined>(`${base}/${enc(电脑单号)}/adjacent`, { params: { direction } })
      .then(r => r.status === 204 ? undefined : r.data),
  materials: (params: PlasticLabelMaterialQuery = {}) =>
    api.get<Paged<PlasticLabelMaterialRow>>(`${base}/materials`, { params }).then(r => r.data),
};
