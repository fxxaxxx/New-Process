import { api } from "./client";
import type { LabelQuery, MaterialLabelSummaryRow } from "./materialLabel";

// 采购入仓查询·明细行（全列·无价格；双击 入库单号 看采购入仓单整单）
export interface PurchaseReceiptQueryDetailRow {
  日期?: string;
  单号?: string;        // = 条码号(来料/条码号)
  入库单号?: string;     // = 采购入仓单号(双击键)
  订单单号?: string;
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

// 汇总与来料标签查询共用口径/结构
export type { MaterialLabelSummaryRow };

export const purchaseReceiptQueryApi = {
  detail: (q: LabelQuery) =>
    api.get<PurchaseReceiptQueryDetailRow[]>("/purchase-receipts/receipt-query/detail", { params: q }).then(r => r.data),
  summary: (q: LabelQuery) =>
    api.get<MaterialLabelSummaryRow[]>("/purchase-receipts/receipt-query/summary", { params: q }).then(r => r.data),
};
