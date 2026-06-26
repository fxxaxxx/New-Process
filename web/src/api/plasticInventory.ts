import { api } from "./client";

export interface PlasticStockRow {
  物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string;
  仓库?: string; 库存数量: number; 物料类别?: string; 仓位号?: string;
  颜色?: string; 工模编号?: string; 塑胶货号?: string; 单价?: number | null; 金额?: number | null;
}
export const plasticInventoryApi = {
  list: (仓库?: string, keyword?: string, 物料类别?: string) =>
    api.get<PlasticStockRow[]>("/plastic-inventory", { params: { 仓库, keyword, 物料类别 } }).then(r => r.data),
};
