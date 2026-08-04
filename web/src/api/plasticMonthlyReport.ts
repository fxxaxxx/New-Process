import { api } from "./client";

export interface PlasticMonthlyReportRow {
  物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 物料类别?: string; 单位?: string;
  期初数量: number; 本期入库: number; 本期出库: number; 期末数量: number;
}
export const plasticMonthlyReportApi = {
  list: (月份: string, 物料类别?: string, keyword?: string) =>
    api.get<PlasticMonthlyReportRow[]>("/plastic-monthly-report", { params: { 月份, 物料类别, keyword } }).then(r => r.data),
};
