import { api } from "./client";

// 来料标签查询·明细行（双击 单号 看采购入仓单整单）
export interface MaterialLabelDetailRow {
  日期?: string;
  单号?: string;
  款号?: string;
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

// 来料标签查询·汇总行（按 物料编号+规格+颜色 合并）
export interface MaterialLabelSummaryRow {
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  数量?: number | null;
}

export interface LabelQuery {
  起?: string;
  止?: string;
  keyword?: string;
  物料类别?: string;
  审核情况?: string;   // 全部 | 已审核 | 未审核
}

export const materialLabelApi = {
  detail: (q: LabelQuery) =>
    api.get<MaterialLabelDetailRow[]>("/purchase-receipts/label-query/detail", { params: q }).then(r => r.data),
  summary: (q: LabelQuery) =>
    api.get<MaterialLabelSummaryRow[]>("/purchase-receipts/label-query/summary", { params: q }).then(r => r.data),
};
