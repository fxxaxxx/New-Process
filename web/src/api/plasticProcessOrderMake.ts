import { api } from "./client";
export interface PlasticProcessOrderMakeRow {
  单据日期?: string; 生产单号?: string; 款号?: string; 塑胶货号?: string; 工模编号?: string; 物料编号?: string;
  物料名称?: string; 颜色?: string; 色粉号?: string; 加工内容?: string; 二次加工内容?: string;
  二次加工类别?: string; 加工次序?: string; 加工字母?: string; 用料名称?: string; 单位?: string;
  用量?: number | null; 计划数量?: number | null; 订购数量?: number | null; 加工单价?: number | null; 金额?: number | null;
}
export interface PlasticProcessOrderMakeParams { 起: string; 止: string; keyword?: string }
export const plasticProcessOrderMakeApi = {
  list: (p: PlasticProcessOrderMakeParams) => api.get<PlasticProcessOrderMakeRow[]>("/plastic-process-order-make", { params: p }).then(r => r.data),
};
