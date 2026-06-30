import { api } from "./client";
export interface PlasticProcessIssueProgressRow {
  订购日期?: string; 交货日期?: string; 订购单号?: string; 生产单号?: string; 款号?: string;
  模具编号?: string; 物料编号?: string; 物料名称?: string; 用料名称?: string; 颜色?: string;
  加工内容?: string; 单位?: string;
  订购数量?: number | null; 单价?: number | null; 订购金额?: number | null;
  领料日期?: string; 领料单号?: string; 领料数量?: number | null;
  未完成数量?: number | null; 未完成金额?: number | null; 完成情况?: string; 加工厂名称?: string;
}
export interface PlasticProcessIssueProgressParams { 加工厂?: string; 起: string; 止: string; keyword?: string; 完成情况?: string }
export const plasticProcessIssueProgressApi = {
  list: (p: PlasticProcessIssueProgressParams) =>
    api.get<PlasticProcessIssueProgressRow[]>("/plastic-process-issue-progress", { params: p }).then(r => r.data),
};
