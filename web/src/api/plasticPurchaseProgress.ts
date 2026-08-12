import { api } from "./client";
export interface PlasticPurchaseProgressRow {
  订购日期?: string; 交货日期?: string; 采购单号?: string; 生产单号?: string; 款号?: string;
  物料编号?: string; 物料名称?: string; 模具编号?: string; 颜色?: string; 单位?: string;
  订购数量?: number | null; 入仓数量?: number | null; 欠数?: number | null; 供应商名称?: string; 审核?: string;
}
// 起/止 可空(后端按可空 DateTime 绑定,空=不限日期)
export interface PlasticPurchaseProgressParams { 供应商?: string; 起?: string; 止?: string; keyword?: string; onlyOwed?: boolean }
export const plasticPurchaseProgressApi = {
  list: (p: PlasticPurchaseProgressParams) => api.get<PlasticPurchaseProgressRow[]>("/plastic-purchase-progress", { params: p }).then(r => r.data),
};
