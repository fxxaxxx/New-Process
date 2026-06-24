import { api } from "./client";
import type { LabelQuery } from "./materialLabel";

// 领料单查询·明细行（无价格；双击 单号 看领料单整单）
export interface MaterialIssueQueryDetailRow {
  类型?: string;
  日期?: string;
  单号?: string;
  生产单号?: string;
  款号?: string;
  领料部门?: string;
  领料人?: string;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  数量?: number | null;
  备注?: string;
  审核?: string;
}

// 领料单查询·汇总行（按 物料编号+规格+颜色 合并，领用数量）
export interface MaterialIssueSummaryRow {
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  领用数量?: number | null;
}

export const materialIssueQueryApi = {
  detail: (q: LabelQuery) =>
    api.get<MaterialIssueQueryDetailRow[]>("/material-issues/issue-query/detail", { params: q }).then(r => r.data),
  summary: (q: LabelQuery) =>
    api.get<MaterialIssueSummaryRow[]>("/material-issues/issue-query/summary", { params: q }).then(r => r.data),
};
