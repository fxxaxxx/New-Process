import { api } from "./client";

export interface PlasticRawMaterialIssueProgressRow {
  开单日期?: string;
  需求单号?: string;
  啤机生产单号?: string;
  领料备注?: string;
  生产车间?: string;
  原料编号?: string;
  原料名称?: string;
  单位?: string;
  需求数量?: number | null;
  已出库数量?: number | null;
  欠数?: number | null;
  进度?: number | null;
  最后出库日期?: string;
  审核?: string;
}

export interface PlasticRawMaterialIssueProgressParams {
  起?: string;
  止?: string;
  keyword?: string;
  领料备注?: string;
  到货情况?: string;
  onlyOwed?: boolean;
}

export const plasticRawMaterialIssueProgressApi = {
  list: (params: PlasticRawMaterialIssueProgressParams) =>
    api.get<PlasticRawMaterialIssueProgressRow[]>("/plastic-raw-material-issue-progress", { params }).then(r => r.data),
};
