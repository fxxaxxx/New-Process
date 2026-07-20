import type { MaterialStockRow } from "../api/materialInventory";

export const AUXILIARY_INVENTORY_WAREHOUSE = "辅料仓库";
export const AUXILIARY_INVENTORY_CATEGORY = "辅料资料";

export interface AuxiliaryInventoryQuery {
  仓库: string;
  物料类别: string;
  keyword?: string;
}

export interface AuxiliaryInventoryRow {
  辅料编号: string;
  辅料名称?: string;
  规格?: string;
  每单位数值?: string;
  单位?: string;
  库存数量: number;
  仓库位置?: string;
}

const clean = (value?: string) => {
  const text = value?.trim();
  return text ? text : undefined;
};

export function buildAuxiliaryInventoryQuery(keyword?: string): AuxiliaryInventoryQuery {
  return {
    仓库: AUXILIARY_INVENTORY_WAREHOUSE,
    物料类别: AUXILIARY_INVENTORY_CATEGORY,
    keyword: clean(keyword),
  };
}

export function toAuxiliaryInventoryRow(row: MaterialStockRow): AuxiliaryInventoryRow {
  return {
    辅料编号: row.物料编号,
    辅料名称: row.物料名称,
    规格: row.规格,
    每单位数值: row.每单位数值,
    单位: row.单位,
    库存数量: row.库存数量,
    仓库位置: row.仓库位置,
  };
}
