import { api } from "./client";

export interface PlasticRawMaterialSummaryRow {
  原料名称?: string; 本月库存: number; 存外厂数量: number; 本月报废: number; 本月总数: number;
}
export const plasticRawMaterialApi = {
  list: (起: string, 止: string, keyword?: string) =>
    api.get<PlasticRawMaterialSummaryRow[]>("/plastic-raw-material-summary", { params: { 起, 止, keyword } }).then(r => r.data),
};
