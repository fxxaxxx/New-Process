import { api } from "./client";

export interface PlasticInOutSummaryRow {
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 物料类别?: string; 单位?: string;
  入仓: number; 退仓: number; 领料: number; 退料: number; 报废: number; 盘点盈亏: number;
}
export const plasticInOutSummaryApi = {
  list: (起: string, 止: string, 物料类别?: string, keyword?: string) =>
    api.get<PlasticInOutSummaryRow[]>("/plastic-in-out-summary", { params: { 起, 止, 物料类别, keyword } }).then(r => r.data),
};
