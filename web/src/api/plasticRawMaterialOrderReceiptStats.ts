import { api } from "./client";

export interface PlasticRawMaterialOrderReceiptStatRow {
  订购日期?: string;
  交货日期?: string;
  订购单号?: string;
  供应商名称?: string;
  原料编号?: string;
  原料名称?: string;
  单位?: string;
  采购单价?: number | null;
  单价HKDLb?: number | null;
  其他成本单价HKDLb?: number | null;
  订货数量包: number;
  订货金额HKD: number;
  入库数量包: number;
  入库订货金额HKD: number;
  入库其他费用HKD: number;
  入库金额合计HKD: number;
  相关数量包: number;
  相关金额HKD: number;
}

export const plasticRawMaterialOrderReceiptStatsApi = {
  list: (起: string, 止: string, keyword?: string) =>
    api.get<PlasticRawMaterialOrderReceiptStatRow[]>("/plastic-raw-material-order-receipt-stats", { params: { 起, 止, keyword } }).then(r => r.data),
};
