import { api } from "./client";

export interface MaterialMonthlyRow {
  物料编号: string;
  物料名称?: string;
  规格?: string;
  每单位数值?: string;
  单位?: string;
  期初库存: number;
  本期入库: number;
  本期出库: number;
  盘点盈亏: number;
  期末库存: number;
  仓库?: string;
  物料类别?: string;
}

export const auxiliaryMonthlyApi = {
  list: (起: string, 止: string, keyword?: string) =>
    api.get<MaterialMonthlyRow[]>("/auxiliary-monthly", { params: { 起, 止, keyword } }).then(r => r.data),
};
