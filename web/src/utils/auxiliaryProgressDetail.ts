import type { AuxiliaryProgressDetailParams, AuxiliaryProgressDetailRow } from "../api/auxiliaryProgressDetail";

export type AuxiliaryProgressDetailArrivalStatus = "未到" | "已到" | "全部";
export type AuxiliaryProgressDetailDateMode = "不选择日期" | "订购日期" | "交货日期";

export interface BuildAuxiliaryProgressDetailQueryInput {
  arrivalStatus: AuxiliaryProgressDetailArrivalStatus;
  dateMode: AuxiliaryProgressDetailDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
}

const clean = (value?: string) => {
  const text = value?.trim();
  return text ? text : undefined;
};

const shortDate = (value?: string) => {
  if (!value) return undefined;
  return String(value).slice(0, 10);
};

const qty = (value: number | null | undefined) => Number(value ?? 0);

export function buildAuxiliaryProgressDetailQuery(input: BuildAuxiliaryProgressDetailQueryInput): AuxiliaryProgressDetailParams {
  const useDate = input.dateMode !== "不选择日期";
  return {
    到货情况: input.arrivalStatus,
    keyword: clean(input.keyword),
    起: useDate ? input.startDate : undefined,
    止: useDate ? input.endDate : undefined,
    日期类型: useDate ? input.dateMode : undefined,
  };
}

export function normalizeAuxiliaryProgressDetailRow(row: AuxiliaryProgressDetailRow): AuxiliaryProgressDetailRow {
  return {
    ...row,
    订购日期: shortDate(row.订购日期),
    交货日期: shortDate(row.交货日期),
    入仓日期: shortDate(row.入仓日期),
    订货数量: qty(row.订货数量),
    入仓数量: row.入仓数量 == null ? null : qty(row.入仓数量),
    总入仓数: qty(row.总入仓数),
    相差数量: qty(row.相差数量),
  };
}

export function getAuxiliaryProgressDetailTextColor(row: Pick<AuxiliaryProgressDetailRow, "相差数量">) {
  return Number(row.相差数量 ?? 0) > 0 ? "#d000d0" : "#111111";
}
