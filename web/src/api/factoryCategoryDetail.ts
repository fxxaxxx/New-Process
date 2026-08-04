import { api } from "./client";

export interface FactoryCategoryDetailRow {
  加工厂类别?: string;
  加工厂编号?: string;
  加工厂名称?: string;
  单据类型?: string;
  单号?: string;
  日期?: string;
  交货日期?: string;
  客户名称?: string;
  数量?: number | null;
  金额?: number | null;
  审核?: string;
}

export interface FactoryCategoryDetailParams {
  起?: string;
  止?: string;
  类别?: string;
  加工厂?: string;
  keyword?: string;
}

export const factoryCategoryDetailApi = {
  list: (params: FactoryCategoryDetailParams) =>
    api.get<FactoryCategoryDetailRow[]>("/assembly-factory-category-detail", { params }).then(r => r.data),
};
