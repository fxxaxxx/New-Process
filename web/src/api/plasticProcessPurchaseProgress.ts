import { api } from "./client";
export interface PlasticProcessPurchaseProgressRow {
  订购日期?: string; 交货日期?: string; 加工采购单号?: string; 生产单号?: string; 款号?: string;
  模具编号?: string; 物料编号?: string; 物料名称?: string; 用料名称?: string; 颜色?: string;
  加工内容?: string; 单位?: string;
  订购数量?: number | null; 单价?: number | null; 订购金额?: number | null;
  入仓数量?: number | null; 入仓金额?: number | null; 剩余数量?: number | null; 剩余金额?: number | null;
  加工厂名称?: string; 审核?: string;
}
export interface PlasticProcessPurchaseProgressParams { 加工厂?: string; 起: string; 止: string; keyword?: string; onlyOwed?: boolean }
export const plasticProcessPurchaseProgressApi = {
  list: (p: PlasticProcessPurchaseProgressParams) =>
    api.get<PlasticProcessPurchaseProgressRow[]>("/plastic-process-purchase-progress", { params: p }).then(r => r.data),
};
