import { api } from "./client";

export interface PlasticProcessShortageRow {
  物料编号?: string;
  共用物料编号?: string;
  物料名称?: string;
  模具编号?: string;
  共用物料?: string;
  物料类别?: string;
  单位?: string;
  欠数?: number | null;
  单价?: number | null;
  金额?: number | null;
}

export interface PlasticProcessShortageParams {
  物料类别?: string;
  审核情况?: string;
  keyword?: string;
  onlyOwed?: boolean;
}

export const plasticProcessShortageApi = {
  list: (p: PlasticProcessShortageParams) =>
    api.get<PlasticProcessShortageRow[]>("/plastic-process-shortage", { params: p }).then(r => r.data),
};
