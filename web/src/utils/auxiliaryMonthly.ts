import type { MaterialMonthlyRow } from "../api/auxiliaryMonthly";
import {
  AUXILIARY_INVENTORY_CATEGORY,
  AUXILIARY_INVENTORY_WAREHOUSE,
} from "./auxiliaryInventory";

export interface AuxiliaryMonthlyQuery {
  仓库: string;
  物料类别: string;
  起: string;
  止: string;
  keyword?: string;
}

export interface AuxiliaryMonthlyRow {
  辅料编号: string;
  辅料名称?: string;
  规格?: string;
  每单位数值?: string;
  单位?: string;
  期初库存: number;
  本期入库: number;
  本期出库: number;
  盘点盈亏: number;
  期末库存: number;
}

const clean = (value?: string) => {
  const text = value?.trim();
  return text ? text : undefined;
};

export function buildAuxiliaryMonthlyQuery(input: { 起: string; 止: string; keyword?: string }): AuxiliaryMonthlyQuery {
  return {
    仓库: AUXILIARY_INVENTORY_WAREHOUSE,
    物料类别: AUXILIARY_INVENTORY_CATEGORY,
    起: input.起,
    止: input.止,
    keyword: clean(input.keyword),
  };
}

export function toAuxiliaryMonthlyRow(row: MaterialMonthlyRow): AuxiliaryMonthlyRow {
  return {
    辅料编号: row.物料编号,
    辅料名称: row.物料名称,
    规格: row.规格,
    每单位数值: row.每单位数值,
    单位: row.单位,
    期初库存: row.期初库存,
    本期入库: row.本期入库,
    本期出库: row.本期出库,
    盘点盈亏: row.盘点盈亏,
    期末库存: row.期末库存,
  };
}
