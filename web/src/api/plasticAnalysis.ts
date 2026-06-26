import { api } from "./client";

export interface PlasticAnalysisDetailRow {
  日期?: string; 生产单号?: string; 款号?: string; 货号?: string; 物料编号?: string; 物料名称?: string;
  颜色?: string; 材料?: string; 单位?: string; 加工内容?: string;
  数量?: number | null; 加工单价?: number | null; 金额?: number | null; 完成?: string;
}
export const plasticAnalysisApi = {
  list: (起: string, 止: string, keyword?: string, 完成?: string) =>
    api.get<PlasticAnalysisDetailRow[]>("/plastic-analysis-detail", { params: { 起, 止, keyword, 完成 } }).then(r => r.data),
};
