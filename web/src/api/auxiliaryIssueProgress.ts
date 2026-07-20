import { api } from "./client";

export interface AuxiliaryIssueProgressRow {
  开单日期?: string;
  装配生产单号?: string;
  领料备注?: string;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  单位?: string;
  需求数量?: number | null;
  已领数量?: number | null;
  未领数量?: number | null;
  操作员?: string;
}

export interface AuxiliaryIssueProgressParams {
  物料类别?: string;
  到货情况?: string;
  日期类型?: string;
  起?: string;
  止?: string;
  keyword?: string;
  领料备注?: string;
}

export const auxiliaryIssueProgressApi = {
  list: (params: AuxiliaryIssueProgressParams) =>
    api.get<AuxiliaryIssueProgressRow[]>("/assembly-purchase-query/auxiliary-issue-progress", { params }).then(r => r.data),
};
