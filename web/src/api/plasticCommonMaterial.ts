import { api } from "./client";
import type { Paged } from "./master";

export interface PlasticCommonMaterialRow {
  ID: number;
  客户?: string;
  塑胶货号?: string;
  工模编号?: string;
  物料名称?: string;
  颜色?: string;
  色粉号?: string;
  用料名称?: string;
  加工内容?: string;
  加工单价?: number | null;
  整啤净重?: number | null;
  原胶件单净重?: number | null;
  整啤模腔数?: number | null;
  套数?: number | null;
  用量?: number | null;
  物料编号?: string;
  共用原料编号?: string;
  调整审核?: string;
  备注内容?: string;
  工模表备注?: string;
}

export interface PlasticCommonQuery {
  客户?: string; 塑胶货号?: string; 工模编号?: string; keyword?: string; 审核情况?: string; page?: number; size?: number;
}

export const plasticCommonMaterialApi = {
  list: (q: PlasticCommonQuery) =>
    api.get<Paged<PlasticCommonMaterialRow>>("/plastic-common-materials", { params: q }).then(r => r.data),
};
