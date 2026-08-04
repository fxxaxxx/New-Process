import { api } from "./client";

export interface PlasticRawMaterialPurchaseProgressRow {
  订购日期?: string;
  交货日期?: string;
  采购单号?: string;
  供应商编号?: string;
  供应商名称?: string;
  原料编号?: string;
  原料名称?: string;
  规格?: string;
  单位?: string;
  单价类型?: string;
  订货数量?: number | null;
  入仓数量?: number | null;
  欠数?: number | null;
  进度?: number | null;
  操作员?: string;
  审核?: string;
  备注?: string;
}

export interface PlasticRawMaterialPurchaseProgressParams {
  供应商?: string;
  起?: string;
  止?: string;
  keyword?: string;
  onlyOwed?: boolean;
  日期类型?: string;
}

export const plasticRawMaterialPurchaseProgressApi = {
  list: (params: PlasticRawMaterialPurchaseProgressParams) =>
    api.get<PlasticRawMaterialPurchaseProgressRow[]>("/plastic-raw-material-purchase-progress", { params }).then(r => r.data),
};
