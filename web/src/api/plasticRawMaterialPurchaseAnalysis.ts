import { api } from "./client";
export interface PlasticRawMaterialPurchaseRow {
  原料编号?: string; 原料名称?: string; 规格?: string; 物料类别?: string; 单位?: string;
  当前库存?: number | null; 安全库存?: number | null; 生产需求?: number | null; 可购数量?: number | null;
}
export interface PlasticRawMaterialPurchaseParams { 物料类别?: string; keyword?: string; onlyBuy?: boolean }
export const plasticRawMaterialPurchaseAnalysisApi = {
  list: (p: PlasticRawMaterialPurchaseParams) =>
    api.get<PlasticRawMaterialPurchaseRow[]>("/plastic-raw-material-purchase-analysis", { params: p }).then(r => r.data),
};
