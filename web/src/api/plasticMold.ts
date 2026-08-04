import { api } from "./client";
import type { Paged } from "./master";

export interface PlasticMoldRow {
  ID: number;
  工模编号?: string;
  工模名称?: string;
  颜色?: string;
  色粉号?: string;
  整啤模腔数?: number | null;
  水口比例?: number | null;
  模具日产量?: number | null;
  整啤毛重?: number | null;
  整啤净重?: number | null;
  啤机机型?: string;
  啤机价钱?: number | null;
  胶件啤工价?: number | null;
  用料名称?: string;
  胶料单价?: number | null;
  原胶料单价?: number | null;
  备注?: string;
}

export const plasticMoldApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<PlasticMoldRow>>("/master/plastic-molds", { params: { page, size, keyword } })
      // 后端按 camelCase 序列化为 id，这里归一化为 ID（与全项目调用方一致）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
};
