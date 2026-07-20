import { api } from "./client";

export interface AuxiliaryProgressDetailRow {
  订购日期?: string;
  交货日期?: string;
  订购单号?: string;
  供应商名称?: string;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  单位?: string;
  单价类型?: string;
  订货数量?: number | null;
  入仓日期?: string;
  入仓单号?: string;
  入仓数量?: number | null;
  总入仓数?: number | null;
  相差数量?: number | null;
}

export interface AuxiliaryProgressDetailParams {
  到货情况?: string;
  起?: string;
  止?: string;
  日期类型?: string;
  keyword?: string;
}

export const auxiliaryProgressDetailApi = {
  list: (params: AuxiliaryProgressDetailParams) =>
    api.get<AuxiliaryProgressDetailRow[]>("/auxiliary-progress-detail", { params }).then(r => r.data),
};
