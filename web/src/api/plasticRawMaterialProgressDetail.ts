import { api } from "./client";

export interface PlasticRawMaterialProgressDetailRow {
  订购日期?: string;
  交货日期?: string;
  订购单号?: string;
  供应商名称?: string;
  原料编号?: string;
  原料名称?: string;
  产地?: string;
  每包重量?: number | null;
  单位?: string;
  单价类型?: string;
  订货数量?: number | null;
  入仓日期?: string;
  入仓单号?: string;
  入仓数量?: number | null;
  总入仓数?: number | null;
  相差数量?: number | null;
  操作员?: string;
  审核?: string;
}

export interface PlasticRawMaterialProgressDetailParams {
  起?: string;
  止?: string;
  keyword?: string;
  到货情况?: string;
  日期类型?: string;
}

export const plasticRawMaterialProgressDetailApi = {
  list: (params: PlasticRawMaterialProgressDetailParams) =>
    api.get<PlasticRawMaterialProgressDetailRow[]>("/plastic-raw-material-progress-detail", { params }).then(r => r.data),
};
