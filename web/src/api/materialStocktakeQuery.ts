import { api } from "./client";
import type { LabelQuery } from "./materialLabel";

// 盘点单查询·明细行（颜色/材料/单价来自物料资料；金额=盈亏数×单价；无「单价」权限则单价/金额为 null；双击 单号 看整单）
export interface MaterialStocktakeQueryDetailRow {
  日期?: string;
  单号?: string;
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  物料类别?: string;
  颜色?: string;
  单位?: string;
  系统数量?: number | null;
  盘点数量?: number | null;
  盈亏数量?: number | null;
  单价?: number | null;
  金额?: number | null;
  备注?: string;
  审核?: string;
}

// 盘点单查询·汇总行（按 物料编号+规格+颜色 合并；系统/盘点/盈亏数=SUM；金额=SUM(盈亏数)×单价）
export interface MaterialStocktakeSummaryRow {
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  物料类别?: string;
  颜色?: string;
  单位?: string;
  系统数量?: number | null;
  盘点数量?: number | null;
  盈亏数量?: number | null;
  单价?: number | null;
  金额?: number | null;
}

export const materialStocktakeQueryApi = {
  detail: (q: LabelQuery) =>
    api.get<MaterialStocktakeQueryDetailRow[]>("/material-stocktakes/stocktake-query/detail", { params: q }).then(r => r.data),
  summary: (q: LabelQuery) =>
    api.get<MaterialStocktakeSummaryRow[]>("/material-stocktakes/stocktake-query/summary", { params: q }).then(r => r.data),
};
