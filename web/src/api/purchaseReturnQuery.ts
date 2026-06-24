import { api } from "./client";
import type { LabelQuery } from "./materialLabel";

// 采购退仓单查询·明细行（无价格；双击 单号 看采购退仓单整单）
export interface PurchaseReturnQueryDetailRow {
  日期?: string;
  单号?: string;
  供应商编号?: string;
  供应商名称?: string;
  生产单号?: string;
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

// 采购退仓单查询·汇总行（按 物料编号+规格+颜色 合并，退仓数量）
export interface PurchaseReturnSummaryRow {
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  退仓数量?: number | null;
}

export const purchaseReturnQueryApi = {
  detail: (q: LabelQuery) =>
    api.get<PurchaseReturnQueryDetailRow[]>("/purchase-returns/return-query/detail", { params: q }).then(r => r.data),
  summary: (q: LabelQuery) =>
    api.get<PurchaseReturnSummaryRow[]>("/purchase-returns/return-query/summary", { params: q }).then(r => r.data),
};
