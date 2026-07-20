import type { MaterialRow } from "../api/materialMaster";

export const AUXILIARY_MATERIAL_ALL = "__ALL__";
export const AUXILIARY_MATERIAL_DEFAULT_CATEGORY = "辅料资料";

export interface AuxiliaryMaterialQueryInput {
  category: string;
  keyword?: string;
  page: number;
  size: number;
}

export interface AuxiliaryMaterialQuery {
  类别?: string;
  keyword?: string;
  page: number;
  size: number;
}

export interface AuxiliaryMaterialRow {
  ID: number;
  物料类别?: string;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  每单位数值?: string;
  辅料计算使用单位?: string;
  单位?: string;
  备注?: string;
  仓库位置?: string;
}

export function buildAuxiliaryMaterialQuery(input: AuxiliaryMaterialQueryInput): AuxiliaryMaterialQuery {
  const keyword = input.keyword?.trim() || undefined;
  return {
    类别: input.category === AUXILIARY_MATERIAL_ALL ? undefined : input.category,
    keyword,
    page: input.page,
    size: input.size,
  };
}

export function toAuxiliaryMaterialRow(row: MaterialRow): AuxiliaryMaterialRow {
  return {
    ID: row.ID,
    物料类别: row.物料类别,
    辅料编号: row.物料编号,
    辅料名称: row.物料名称,
    规格: row.规格,
    每单位数值: row.码换算,
    辅料计算使用单位: row.单位,
    单位: row.单位,
    备注: row.备注,
    仓库位置: row.仓库位置,
  };
}
