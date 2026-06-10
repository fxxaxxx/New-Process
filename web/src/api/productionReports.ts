import { api } from "./client";

export interface BomMaterialRow {
  款号?: string; 款式?: string; 物料编号?: string; 物料名称?: string;
  物料类别?: string; 规格?: string; 颜色?: string; 单位?: string; 使用数量?: number | null;
}

export interface BomStyleRow {
  款号?: string; 款式?: string; 单价?: number | null; 物料项数: number;
}

export interface OrderSummaryRow {
  货号?: string; 款式?: string; 接单数量?: number | null; 订单数: number;
}

export const productionReportApi = {
  bomMaterials: (keyword?: string) =>
    api.get<BomMaterialRow[]>("/production-reports/bom-materials", { params: { keyword } }).then(r => r.data),
  bomStyles: (keyword?: string) =>
    api.get<BomStyleRow[]>("/production-reports/bom-styles", { params: { keyword } }).then(r => r.data),
  orderSummary: (keyword?: string) =>
    api.get<OrderSummaryRow[]>("/production-reports/order-summary", { params: { keyword } }).then(r => r.data),
};
