import { api } from "./client";

export interface StyleColor { 颜色编号?: string | null; 颜色名称?: string | null }
export interface StyleProcess { id: number; 工序号?: string; 工序名称?: string; 单价?: number | null; 工序类型?: string; [k: string]: unknown }
export interface StyleBomLine { id: number; 物料编号?: string; 物料名称?: string; 单位?: string; 使用数量?: number | null; [k: string]: unknown }
// BOM物料设置编辑行（用量=使用数量，材料=物料类别；工模编号 UI-only/无持久列）
export interface StyleMaterial {
  物料编号?: string | null;
  物料名称?: string | null;
  物料类别?: string | null;
  规格?: string | null;
  颜色?: string | null;
  单位?: string | null;
  使用数量?: number | null;
}
export interface StyleFull {
  主档: Record<string, unknown>;
  颜色: StyleColor[];
  尺码: string[];
  工序: StyleProcess[];
  物料: StyleBomLine[];
}

const enc = encodeURIComponent;

export const stylesApi = {
  full: (款号: string) => api.get<StyleFull>(`/styles/${enc(款号)}/full`).then(r => r.data),
  saveColors: (款号: string, colors: StyleColor[]) => api.put(`/styles/${enc(款号)}/colors`, colors),
  saveSizes: (款号: string, sizes: string[]) => api.put(`/styles/${enc(款号)}/sizes`, sizes),
  saveMaterials: (款号: string, materials: StyleMaterial[]) => api.put(`/styles/${enc(款号)}/materials`, materials),
};
