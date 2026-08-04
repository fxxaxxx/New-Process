import { api } from "./client";
export interface PlasticPurchaseProgressDetailRow {
  订购日期?: string; 交货日期?: string; 采购单号?: string; 生产单号?: string; 款号?: string;
  物料编号?: string; 物料名称?: string; 模具编号?: string; 颜色?: string; 单位?: string;
  订购数量?: number | null; 入仓数量?: number | null; 欠数?: number | null;
  入仓日期?: string; 入仓单号?: string; 完成情况?: string; 供应商名称?: string; 审核?: string;
}
export interface PlasticPurchaseProgressDetailParams { 供应商?: string; 起: string; 止: string; keyword?: string; 完成情况?: string }
export const plasticPurchaseProgressDetailApi = {
  list: (p: PlasticPurchaseProgressDetailParams) => api.get<PlasticPurchaseProgressDetailRow[]>("/plastic-purchase-progress-detail", { params: p }).then(r => r.data),
};
