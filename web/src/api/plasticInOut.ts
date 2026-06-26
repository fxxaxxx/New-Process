import { api } from "./client";

export interface PlasticInOutRow {
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 物料类别?: string; 单位?: string; 仓库?: string;
  期初数量: number; 本期入库: number; 本期出库: number; 期末数量: number;
}
export const plasticInOutApi = {
  list: (起: string, 止: string, 仓库?: string, keyword?: string) =>
    api.get<PlasticInOutRow[]>("/plastic-in-out", { params: { 起, 止, 仓库, keyword } }).then(r => r.data),
};
