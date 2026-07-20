import { api } from "./client";

export interface AuxiliaryIssueDetailRow {
  开单日期?: string;
  装配生产单号?: string;
  领料备注?: string;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  单位?: string;
  需求数量?: number | null;
  领料日期?: string;
  领料单号?: string;
  领料数量?: number | null;
  合计已领数量?: number | null;
  未领数量?: number | null;
}

export interface AuxiliaryIssueDetailParams {
  到货情况?: string;
  起?: string;
  止?: string;
  日期类型?: string;
  keyword?: string;
  领料备注?: string;
}

export const auxiliaryIssueDetailApi = {
  list: (params: AuxiliaryIssueDetailParams) =>
    api.get<AuxiliaryIssueDetailRow[]>("/auxiliary-issue-detail", { params }).then(r => r.data),
};
