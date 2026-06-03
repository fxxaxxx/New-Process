import { api } from "./client";

export interface StyleColor { 颜色编号?: string | null; 颜色名称?: string | null }
export interface StyleProcess { id: number; 工序号?: string; 工序名称?: string; 单价?: number | null; 工序类型?: string; [k: string]: unknown }
export interface StyleBomLine { id: number; 物料编号?: string; 物料名称?: string; 单位?: string; 使用数量?: number | null; [k: string]: unknown }
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
};
