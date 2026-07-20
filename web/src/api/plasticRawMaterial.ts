import { api } from "./client";

export interface PlasticRawMaterialSummaryRow {
  原料名称?: string; 本月库存: number; 存外厂数量: number; 本月报废: number; 本月总数: number;
}

export interface PlasticRawMaterialInventoryRow {
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  每包重量?: number | null;
  单位?: string;
  库存数量: number;
  物料类别?: string;
  有发生: boolean;
}

export interface PlasticRawMaterialMonthlyRow {
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  每包重量?: number | null;
  单位?: string;
  期初库存: number;
  本期入库: number;
  本期出库: number;
  盘点盈亏: number;
  期末库存: number;
  外发库存: number;
  物料类别?: string;
}

export const plasticRawMaterialApi = {
  list: (起: string, 止: string, keyword?: string) =>
    api.get<PlasticRawMaterialSummaryRow[]>("/plastic-raw-material-summary", { params: { 起, 止, keyword } }).then(r => r.data),
  inventory: (物料类别?: string, keyword?: string, displayMode = "occurred") =>
    api.get<PlasticRawMaterialInventoryRow[]>("/plastic-raw-material-inventory", { params: { 物料类别, keyword, displayMode } }).then(r => r.data),
  monthly: (起: string, 止: string, 物料类别?: string, keyword?: string) =>
    api.get<PlasticRawMaterialMonthlyRow[]>("/plastic-raw-material-monthly", { params: { 起, 止, 物料类别, keyword } }).then(r => r.data),
};
