import { api } from "./client";
import type { LabelQuery } from "./materialLabel";

// 退料单查询·明细行（无价格；双击 单号 看退料单整单）
export interface MaterialReturnQueryDetailRow {
  生产单号?: string;
  款号?: string;
  日期?: string;
  单号?: string;
  退料部门?: string;
  退料人?: string;
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

// 退料单查询·汇总行（按 生产单号+物料编号+规格+颜色 合并，退料数量）
export interface MaterialReturnSummaryRow {
  生产单号?: string;
  款号?: string;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  退料数量?: number | null;
}

export const materialReturnQueryApi = {
  detail: (q: LabelQuery) =>
    api.get<MaterialReturnQueryDetailRow[]>("/material-returns/return-query/detail", { params: q }).then(r => r.data),
  summary: (q: LabelQuery) =>
    api.get<MaterialReturnSummaryRow[]>("/material-returns/return-query/summary", { params: q }).then(r => r.data),
};
