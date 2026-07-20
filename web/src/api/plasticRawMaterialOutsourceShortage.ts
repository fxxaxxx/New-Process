import { api } from "./client";

export interface PlasticRawMaterialOutsourceShortageRow {
  供应商编号?: string;
  供应商名称?: string;
  供应商类别?: string;
  原料编号?: string;
  原料名称?: string;
  单位?: string;
  发外欠数?: number | null;
}

export interface PlasticRawMaterialOutsourceShortageParams {
  供应商类别?: string;
  keyword?: string;
  onlyOwed?: boolean;
}

export const plasticRawMaterialOutsourceShortageApi = {
  list: (params: PlasticRawMaterialOutsourceShortageParams) =>
    api.get<PlasticRawMaterialOutsourceShortageRow[]>("/plastic-raw-material-outsource-shortage", { params }).then(r => r.data),
};
