import { api } from "./client";
import type { Paged } from "./master";

export interface PlasticMaterialCategoryNode { 类别?: string; 数量: number }

export interface PlasticMaterialRow {
  ID: number;
  物料类别?: string;
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  仓位号?: string;
  单价?: number | null;
  销售价?: number | null;
  库存?: number | null;
  最低库存?: number | null;
  最高库存?: number | null;
  供应商编号?: string;
  供应商名称?: string;
  备注?: string;
}

export const plasticMaterialMasterApi = {
  categories: () =>
    api.get<PlasticMaterialCategoryNode[]>("/plastic-material-master/categories").then(r => r.data),
  list: (类别?: string, keyword?: string, page = 1, size = 50, onlyStock?: boolean) =>
    api.get<Paged<PlasticMaterialRow>>("/plastic-material-master", { params: { 类别, keyword, page, size, onlyStock } }).then(r => r.data),
};
