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
  // 款号物料总表 台头行（老数据可能没有，为 null 时回落"第一行物料"水合）
  单头?: {
    日期?: string;
    客户编号?: string;
    客户名称?: string;
    单位?: string;
    默认单价?: string;
    类型?: string;
    操作员?: string;
    审核?: string;
    备注?: string;
  } | null;
}

// BOM物料设置保存载荷：单头(客户/日期/单位，逐行落库；默认单价/类型 upsert 到款号物料总表) + 明细
export interface BomSave {
  客户编号?: string | null;
  客户名称?: string | null;
  日期?: string | null;
  单位?: string | null;
  默认单价?: string;
  类型?: string;
  明细: StyleMaterial[];
  扩展?: AssemblyMaterialExtension | null;
  报价?: AssemblyMaterialQuote[] | null;
}

// 已设置的半成品/成品款号（BOM 明细可调入下级半成品，半成品共用物料设置.产品货号）
export interface SemiOption {
  款号: string;
  款式?: string | null;
  类别?: string | null;
  需求用量?: number | null;
  单位?: string | null;
}

// 款号列表项（取自 GET /api/master/styles，款号资料·打开权限）
export interface StyleListItem { id: number; 款号?: string; 款式?: string; [k: string]: unknown }

// 生产通知单 货号选择:已做 BOM 物料设置的款号及单头信息
export interface BomHeaderOption {
  款号?: string; 款式?: string; 客户编号?: string; 客户名称?: string;
  单位?: string; 默认单价?: string; 类型?: string;
}
interface Paged<T> { items: T[]; total: number }

const enc = encodeURIComponent;

export const stylesApi = {
  full: (款号: string) => api.get<StyleFull>(`/styles/${enc(款号)}/full`).then(r => r.data),  materials: (款号: string) => api.get<StyleMaterialsView>(`/styles/${enc(款号)}/materials`)
    // 报价行后端按 camelCase 序列化为 id，这里归一化为 ID（载入/保存均读 ID）
    .then(r => ({
      ...r.data,
      报价: r.data.报价?.map(q => ({ ...q, ID: (q as unknown as { id?: number }).id ?? q.ID })) ?? r.data.报价,
    })),
  list: (keyword = "", page = 1, size = 50) =>
    api.get<Paged<StyleListItem>>("/master/styles", { params: { page, size, keyword } }).then(r => r.data),
  // 生产通知单 货号选择:已做 BOM 物料设置的款号及单头信息
  bomHeaders: (keyword = "") =>
    api.get<BomHeaderOption[]>("/styles/bom-headers", { params: { keyword } }).then(r => r.data),
  semiOptions: () => api.get<SemiOption[]>("/styles/semi-options").then(r => r.data),
  saveColors: (款号: string, colors: StyleColor[]) => api.put(`/styles/${enc(款号)}/colors`, colors),
  saveSizes: (款号: string, sizes: string[]) => api.put(`/styles/${enc(款号)}/sizes`, sizes),
  saveMaterials: (款号: string, body: BomSave) => api.put(`/styles/${enc(款号)}/materials`, body),
  copyBom: (款号: string, body: { 目标款号: string; 覆盖?: boolean }) =>
    api.post(`/styles/${enc(款号)}/copy`, body),
  // BOM 台头审核/反审核（翻转 款号物料总表.审核；BOM 物料设置入口用，区别于装配入口的 调整审核）
  bomAudit: (款号: string) => api.post(`/styles/${enc(款号)}/bom-audit`),
  bomReverseAudit: (款号: string) => api.post(`/styles/${enc(款号)}/bom-reverse-audit`),
};
