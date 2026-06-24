import { api } from "./client";
import type { LabelQuery } from "./materialLabel";

// 报废单查询·明细行（无价格；双击 单号 看报废单整单）
export interface MaterialScrapQueryDetailRow {
  生产单号?: string;
  款号?: string;
  日期?: string;
  单号?: string;
  报废部门?: string;
  报废人?: string;
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

// 报废单查询·汇总行（按 生产单号+物料编号+规格+颜色 合并，报废数量）
export interface MaterialScrapSummaryRow {
  生产单号?: string;
  款号?: string;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  报废数量?: number | null;
}

export const materialScrapQueryApi = {
  detail: (q: LabelQuery) =>
    api.get<MaterialScrapQueryDetailRow[]>("/material-scraps/scrap-query/detail", { params: q }).then(r => r.data),
  summary: (q: LabelQuery) =>
    api.get<MaterialScrapSummaryRow[]>("/material-scraps/scrap-query/summary", { params: q }).then(r => r.data),
};
