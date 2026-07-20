import { api } from "./client";

export interface PlasticRawMaterialIssueProgressDetailRow {
  开单日期?: string;
  啤机生产单号?: string;
  领料备注?: string;
  原料编号?: string;
  原料名称?: string;
  单位?: string;
  需求数量?: number | null;
  啤机外发单号?: string;
  领料日期?: string;
  领料单号?: string;
  领料数量?: number | null;
  合计已领数量?: number | null;
  未领数量?: number | null;
  审核?: string;
}

export interface PlasticRawMaterialIssueProgressDetailParams {
  起?: string;
  止?: string;
  keyword?: string;
  到货情况?: string;
  日期类型?: string;
  领料备注?: string;
}

export const plasticRawMaterialIssueProgressDetailApi = {
  list: (params: PlasticRawMaterialIssueProgressDetailParams) =>
    api.get<PlasticRawMaterialIssueProgressDetailRow[]>("/plastic-raw-material-issue-progress-detail", { params }).then(r => r.data),
};
