import { api } from "./client";

export interface PlasticStockRow {
  物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string;
  仓库?: string; 库存数量: number; 物料类别?: string; 仓位号?: string;
}
export const plasticInventoryApi = {
  list: (仓库?: string, keyword?: string) =>
    api.get<PlasticStockRow[]>("/plastic-inventory", { params: { 仓库, keyword } }).then(r => r.data),
};
