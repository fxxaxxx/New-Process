import { api } from "./client";
export interface PlasticOrderMakeRow {
  单据日期?: string; 生产单号?: string; 款号?: string; 塑胶货号?: string; 工模编号?: string; 物料编号?: string;
  物料名称?: string; 颜色?: string; 用料名称?: string; 单位?: string;
  用量?: number | null; 计划数量?: number | null; 订购数量?: number | null; 加工单价?: number | null; 金额?: number | null;
}
export interface PlasticOrderMakeParams { 起: string; 止: string; keyword?: string }
export const plasticOrderMakeApi = {
  list: (p: PlasticOrderMakeParams) => api.get<PlasticOrderMakeRow[]>("/plastic-order-make", { params: p }).then(r => r.data),
};
