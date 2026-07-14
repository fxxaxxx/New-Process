import { api } from "./client";

export type SemiFinishedCommonMaterialAuditStatus = "全部" | "已审核" | "未审核";
export type SemiFinishedCommonMaterialField =
  | "产品货号"
  | "客户"
  | "产品名称"
  | "产品装配名称"
  | "配件编号"
  | "共用物料编号";

export interface SemiFinishedCommonMaterialListQuery {
  重复内容?: string;
  待操作物料?: string;
  审核情况?: Exclude<SemiFinishedCommonMaterialAuditStatus, "全部">;
  查询字段?: SemiFinishedCommonMaterialField | string;
  keyword?: string;
  精确?: boolean;
  page?: number;
  size?: number;
}

export interface SemiFinishedCommonMaterialRow {
  产品货号: string;
  客户?: string | null;
  产品名称?: string | null;
  产品装配名称?: string | null;
  库存单价?: number | null;
  配件编号?: string | null;
  共用物料编号?: string | null;
  调整审核: "已审核" | "未审核";
  备注内容?: string | null;
}

export interface PagedSemiFinishedCommonMaterials {
  items: SemiFinishedCommonMaterialRow[];
  total: number;
}

export type SemiFinishedCommonMaterialQuery = SemiFinishedCommonMaterialListQuery;
export type SemiFinishedCommonMaterialsResult = PagedSemiFinishedCommonMaterials;

const base = "/semi-finished-common-materials";
const enc = encodeURIComponent;

export const semiFinishedCommonMaterialsApi = {
  list: (params: SemiFinishedCommonMaterialListQuery = {}) =>
    api.get<PagedSemiFinishedCommonMaterials>(base, { params }).then(r => r.data),
  audit: (产品货号: string) => api.post(`${base}/${enc(产品货号)}/audit`),
  reverseAudit: (产品货号: string) => api.post(`${base}/${enc(产品货号)}/reverse-audit`),
};
