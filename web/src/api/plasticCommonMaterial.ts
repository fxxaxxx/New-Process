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
  出模数?: number | null;
  水口比例?: number | null;
  整啤毛重?: number | null;
  模具日产量?: number | null;
  啤机机型?: string;
  啤机价钱?: number | null;
  胶件啤工价?: number | null;
  胶料单价?: number | null;
  原胶料单价?: number | null;
  加工总单价?: number | null;
  其它成本?: number | null;
  二次加工内容?: string;
}

export interface PlasticCommonQuery {
  客户?: string; 塑胶货号?: string; 工模编号?: string; keyword?: string; 审核情况?: string; page?: number; size?: number;
}

export const plasticCommonMaterialApi = {
  list: (q: PlasticCommonQuery) =>
    api.get<Paged<PlasticCommonMaterialRow>>("/plastic-common-materials", { params: q })
      // 后端按 camelCase 序列化为 id，这里归一化为 ID（与全项目调用方一致）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
};
