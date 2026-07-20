import type { AuxiliaryOrderReceiptStatRow } from "../api/auxiliaryOrderReceiptStats";

export type AuxiliaryOrderReceiptStatsDateMode = "订购日期" | "交货日期";

export interface AuxiliaryOrderReceiptStatsQuery {
  起: string;
  止: string;
  日期类型: AuxiliaryOrderReceiptStatsDateMode;
  keyword?: string;
}

const clean = (value?: string) => {
  const text = value?.trim();
  return text ? text : undefined;
};

export function buildAuxiliaryOrderReceiptStatsQuery(input: AuxiliaryOrderReceiptStatsQuery): AuxiliaryOrderReceiptStatsQuery {
  return {
    起: input.起,
    止: input.止,
    日期类型: input.日期类型,
    keyword: clean(input.keyword),
  };
}

const qty = (value: number | null | undefined) => Number(value ?? 0);

export function toAuxiliaryOrderReceiptStatsRow(row: AuxiliaryOrderReceiptStatRow): AuxiliaryOrderReceiptStatRow {
  return {
    ...row,
    采购单价: row.采购单价 ?? null,
    单价HKD: row.单价HKD ?? null,
    其他成本单价HKD: row.其他成本单价HKD ?? null,
    订货数量: qty(row.订货数量),
    订货金额HKD: qty(row.订货金额HKD),
    入库数量: qty(row.入库数量),
    入库订货金额HKD: qty(row.入库订货金额HKD),
    入库其他费用HKD: qty(row.入库其他费用HKD),
    入库金额合计HKD: qty(row.入库金额合计HKD),
    相关数量: qty(row.相关数量),
    相关金额HKD: qty(row.相关金额HKD),
  };
}
