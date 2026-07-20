import { api } from "./client";

export interface MaterialStockRow {
  物料编号: string; 物料名称?: string; 规格?: string; 单位?: string; 仓库?: string; 库存数量: number;
  货号?: string; 物料类别?: string;
  每单位数值?: string; 仓库位置?: string;
}

export const materialInventoryApi = {
  list: (仓库?: string, keyword?: string, 物料类别?: string) =>
    api.get<MaterialStockRow[]>("/material-inventory", { params: { 仓库, keyword, 物料类别 } }).then(r => r.data),
};
