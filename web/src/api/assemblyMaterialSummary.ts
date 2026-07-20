import { api } from "./client";

export interface AssemblyMaterialSummaryRow {
  客户?: string;
  产品货号?: string;
  产品名称?: string;
  配件编号?: string;
  产品装配名称?: string;
  日期?: string;
  加工厂名称?: string;
  装配方式?: string;
  对比相差?: number | null;
  相关比例?: string;
  仓库位置?: string;
  需求用量?: number | null;
  操作员?: string;
  备注?: string;
}

export interface AssemblyMaterialDetailRow {
  客户?: string;
  产品货号?: string;
  产品名称?: string;
  配件编号?: string;
  产品装配名称?: string;
  日期?: string;
  装配方式?: string;
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  材料?: string;
  颜色?: string;
  单位?: string;
  用量?: number | null;
  备注?: string;
  操作员?: string;
}

export interface AssemblyMaterialSummaryResult {
  汇总: AssemblyMaterialSummaryRow[];
  明细: AssemblyMaterialDetailRow[];
}

export interface AssemblyMaterialSummaryParams {
  起?: string;
  止?: string;
  启用日期?: boolean;
  客户?: string;
  装配方式?: string;
  完成情况?: string;
  keyword?: string;
}

export const assemblyMaterialSummaryApi = {
  list: (params: AssemblyMaterialSummaryParams) =>
    api.get<AssemblyMaterialSummaryResult>("/assembly-material-summary", { params }).then(r => r.data),
};
