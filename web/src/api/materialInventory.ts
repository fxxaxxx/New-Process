import { api } from "./client";
import type { MaterialCategoryNode } from "./materialMaster";

export interface MaterialStockRow {
  物料编号: string; 物料名称?: string; 规格?: string; 单位?: string; 仓库?: string; 库存数量: number;
  货号?: string; 物料类别?: string;
  每单位数值?: string; 仓库位置?: string;
}

export const materialInventoryApi = {
  list: (仓库?: string, keyword?: string, 物料类别?: string, 含零库存?: boolean) =>
    api.get<MaterialStockRow[]>("/material-inventory", { params: { 仓库, keyword, 物料类别, 含零库存 } }).then(r => r.data),
  // 左树分类计数：每个类别「有库存(非零)的物料数」，与列表仅非零口径一致
  categories: () => api.get<MaterialCategoryNode[]>("/material-inventory/categories").then(r => r.data),
};
