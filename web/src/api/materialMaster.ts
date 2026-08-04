import { api } from "./client";
import type { Paged } from "./master";
import type { ImportResult } from "./importResult";

// 左树节点：编号/父级 来自物料类别主数据（父级=父类别编号，空=顶级）；
// 仅存在于物料行的类别 编号/父级 为 null。扁平结构，页面按 父级 组树。
export interface MaterialCategoryNode { 编号?: string; 类别?: string; 数量: number; 父级?: string | null }

export interface MaterialRow {
  ID: number;
  物料类别?: string;
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  单价?: number | null;
  销售价?: number | null;
  库存?: number | null;
  最低库存?: number | null;
  最高库存?: number | null;
  供应商编号?: string;
  供应商名称?: string;
  备注?: string;
  仓库位置?: string;
  码换算?: string;
}

export const materialMasterApi = {
  categories: () =>
    api.get<MaterialCategoryNode[]>("/material-master/categories").then(r => r.data),
  list: (类别?: string, keyword?: string, page = 1, size = 50, onlyStock?: boolean, 含子级?: boolean) =>
    api.get<Paged<MaterialRow>>("/material-master", { params: { 类别, keyword, page, size, onlyStock, 含子级 } })
      // 后端按 camelCase 序列化为 id，这里归一化为 ID（与全项目调用方一致）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
  nextCode: (类别?: string) =>
    api.get<{ 编号: string }>("/material-master/next-code", { params: { 类别 } }).then(r => r.data.编号),
  create: (body: Record<string, unknown>) =>
    api.post<MaterialRow>("/material-master", body).then(r => r.data),
  importRows: (rows: Record<string, unknown>[]) =>
    api.post<ImportResult>("/material-master/import", { rows }).then(r => r.data),
};
