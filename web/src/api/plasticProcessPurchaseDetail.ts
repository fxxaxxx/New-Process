import { api } from "./client";
export interface PlasticProcessPurchaseDetailRow {
  订购日期?: string; 交货日期?: string; 订购单号?: string; 生产单号?: string; 款号?: string;
  模具编号?: string; 物料编号?: string; 物料名称?: string; 用料名称?: string; 颜色?: string;
  加工内容?: string; 单位?: string;
  订购数量?: number | null; 单价?: number | null; 订购金额?: number | null;
  入仓日期?: string; 入仓单号?: string; 入仓数量?: number | null; 入仓金额?: number | null;
  未完成数量?: number | null; 未完成金额?: number | null; 完成情况?: string; 加工厂名称?: string;
}
export interface PlasticProcessPurchaseDetailParams { 加工厂?: string; 起: string; 止: string; keyword?: string; 完成情况?: string }
export const plasticProcessPurchaseDetailApi = {
  list: (p: PlasticProcessPurchaseDetailParams) =>
    api.get<PlasticProcessPurchaseDetailRow[]>("/plastic-process-purchase-detail", { params: p }).then(r => r.data),
};
