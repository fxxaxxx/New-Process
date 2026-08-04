import { api } from "./client";
import type { Paged } from "./master";
import type { ImportResult } from "./importResult";

export interface PlasticMaterialCategoryNode { 编号?: string; 类别?: string; 数量: number; 父级?: string }

export interface PlasticMaterialRow {
  ID: number;
  物料类别?: string;
  物料编号?: string;
  工模编号?: string;
  客户?: string;
  款号?: string;
  物料名称?: string;
  规格?: string;
  颜色?: string;
  色粉号?: string;
  加工内容?: string;
  二次加工?: string;
  原料名称?: string;
  用料名称?: string;
  啤机机型?: string;
  单位?: string;
  仓位号?: string;
  单价?: number | null;
  销售价?: number | null;
  二次加工价?: number | null;
  加工总单价?: number | null;
  其他成本?: number | null;
  整啤毛重?: number | null;
  整啤净重?: number | null;
  原胶件单净重?: number | null;
  整啤模腔数?: number | null;
  套数?: number | null;
  出模数?: number | null;
  用量?: number | null;
  水口比例?: number | null;
  模具日产量?: number | null;
  啤机价钱?: number | null;
  胶件啤工价?: number | null;
  原料单价?: number | null;
  胶件料价?: number | null;
  原胶料单价?: number | null;
  库存?: number | null;
  最低库存?: number | null;
  最高库存?: number | null;
  供应商编号?: string;
  供应商名称?: string;
  备注?: string;
}

export const plasticMaterialMasterApi = {
  categories: () =>
    api.get<PlasticMaterialCategoryNode[]>("/plastic-material-master/categories").then(r => r.data),
  list: (类别?: string, keyword?: string, page = 1, size = 50, onlyStock?: boolean, 含子级?: boolean) =>
    api.get<Paged<PlasticMaterialRow>>("/plastic-material-master", { params: { 类别, keyword, page, size, onlyStock, 含子级 } })
      // 后端按 camelCase 序列化为 id，这里归一化为 ID（与全项目调用方一致）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
  importRows: (rows: Record<string, unknown>[]) =>
    api.post<ImportResult>("/plastic-material-master/import", { rows }).then(r => r.data),
};
