import { api } from "./client";

export interface StyleColor { 颜色编号?: string | null; 颜色名称?: string | null }
export interface StyleProcess { id: number; 工序号?: string; 工序名称?: string; 单价?: number | null; 工序类型?: string; [k: string]: unknown }
export interface StyleBomLine {
  id: number;
  物料编号?: string; 物料名称?: string;
  物料类别?: string | null; 规格?: string | null; 颜色?: string | null;
  单位?: string; 使用数量?: number | null;
  客户编号?: string | null; 客户名称?: string | null; 日期?: string | null;
  工模编号?: string | null; 备注?: string | null;
  [k: string]: unknown;
}
// BOM物料设置编辑行（用量=使用数量，材料=物料类别；工模编号 UI-only/无持久列）
export interface StyleMaterial {
  物料编号?: string | null;
  物料名称?: string | null;
  物料类别?: string | null;
  规格?: string | null;
  颜色?: string | null;
  单位?: string | null;
  使用数量?: number | null;
  工模编号?: string | null;
  备注?: string | null;
}

export interface AssemblyMaterialExtension {
  产品装配名称?: string | null;
  配件编号?: string | null;
  共用物料编号?: string | null;
  装配方式?: string | null;
  类别?: string | null;
  库存单价HK?: number | null;
  其他成本HK?: number | null;
  需求用量?: number | null;
  单位?: string | null;
  半成品计算库存?: boolean;
  备注内容?: string | null;
  调整审核?: boolean;
  审核人?: string | null;
  审核时间?: string | null;
}

export interface AssemblyMaterialQuote {
  ID?: number | null;
  物料编号?: string | null;
  物料名称?: string | null;
  合作方类型: string;
  合作方编号?: string | null;
  合作方名称?: string | null;
  报价日期?: string | null;
  货币?: string | null;
  单价?: number | null;
  港币价?: number | null;
  对比相差?: number | null;
  相差比例?: number | null;
  是否默认?: boolean;
  顺序?: number;
  备注?: string | null;
}
export interface StyleFull {
  主档: Record<string, unknown>;
  颜色: StyleColor[];
  尺码: string[];
  工序: StyleProcess[];
  物料: StyleBomLine[];
}

// BOM物料设置 轻量载入(仅 款式+物料,提速)
export interface StyleMaterialsView {
  款号: string;
  款式?: string | null;
  物料: StyleBomLine[];
  扩展?: AssemblyMaterialExtension | null;
  报价?: AssemblyMaterialQuote[] | null;
}

// BOM物料设置保存载荷：单头(客户/日期/单位，逐行落库) + 明细
export interface BomSave {
  客户编号?: string | null;
  客户名称?: string | null;
  日期?: string | null;
  单位?: string | null;
  明细: StyleMaterial[];
  扩展?: AssemblyMaterialExtension | null;
  报价?: AssemblyMaterialQuote[] | null;
}

// 款号列表项（取自 GET /api/master/styles，款号资料·打开权限）
export interface StyleListItem { id: number; 款号?: string; 款式?: string; [k: string]: unknown }
interface Paged<T> { items: T[]; total: number }

const enc = encodeURIComponent;

export const stylesApi = {
  full: (款号: string) => api.get<StyleFull>(`/styles/${enc(款号)}/full`).then(r => r.data),
  materials: (款号: string) => api.get<StyleMaterialsView>(`/styles/${enc(款号)}/materials`).then(r => r.data),
  list: (keyword = "", page = 1, size = 50) =>
    api.get<Paged<StyleListItem>>("/master/styles", { params: { page, size, keyword } }).then(r => r.data),
  saveColors: (款号: string, colors: StyleColor[]) => api.put(`/styles/${enc(款号)}/colors`, colors),
  saveSizes: (款号: string, sizes: string[]) => api.put(`/styles/${enc(款号)}/sizes`, sizes),
  saveMaterials: (款号: string, body: BomSave) => api.put(`/styles/${enc(款号)}/materials`, body),
};
