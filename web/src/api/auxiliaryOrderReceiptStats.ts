import { api } from "./client";

export interface AuxiliaryOrderReceiptStatRow {
  订购日期?: string;
  交货日期?: string;
  订购单号?: string;
  供应商名称?: string;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  单位?: string;
  采购单价?: number | null;
  单价HKD?: number | null;
  其他成本单价HKD?: number | null;
  订货数量: number;
  订货金额HKD: number;
  入库数量: number;
  入库订货金额HKD: number;
  入库其他费用HKD: number;
  入库金额合计HKD: number;
  相关数量: number;
  相关金额HKD: number;
  操作员?: string;
}

export const auxiliaryOrderReceiptStatsApi = {
  list: (起: string, 止: string, 日期类型?: string, keyword?: string) =>
    api.get<AuxiliaryOrderReceiptStatRow[]>("/auxiliary-order-receipt-stats", {
      params: { 起, 止, 日期类型, keyword },
    }).then(r => r.data),
};
