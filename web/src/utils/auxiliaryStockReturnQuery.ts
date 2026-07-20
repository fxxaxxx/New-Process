import type {
  AuxiliaryStockReturnQueryDetailRow,
  AuxiliaryStockReturnQueryParams,
  AuxiliaryStockReturnQuerySummaryRow,
} from "../api/auxiliaryStockReturnQuery";

export type AuxiliaryStockReturnDateMode = "不选择日期" | "日期";
export type AuxiliaryStockReturnAuditStatus = "全部" | "已审核" | "未审核";

export interface BuildAuxiliaryStockReturnQueryInput {
  dateMode: AuxiliaryStockReturnDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  category?: string;
  auditStatus?: AuxiliaryStockReturnAuditStatus;
}

const clean = (value?: string) => {
  const text = value?.trim();
  return text ? text : undefined;
};

const cleanCategory = (value?: string) => {
  const text = clean(value);
  return text && text !== "<所有类别>" && text !== "所有类别" ? text : undefined;
};

const shortDate = (value?: string | null) => {
  if (!value) return undefined;
  return String(value).slice(0, 10);
};

const qty = (value: number | null | undefined) => Number(value ?? 0);

export function buildAuxiliaryStockReturnQuery(
  input: BuildAuxiliaryStockReturnQueryInput,
): AuxiliaryStockReturnQueryParams {
  const useDate = input.dateMode !== "不选择日期";
  const audit = input.auditStatus && input.auditStatus !== "全部" ? input.auditStatus : undefined;
  return {
    起: useDate ? input.startDate : undefined,
    止: useDate ? input.endDate : undefined,
    日期类型: useDate ? input.dateMode : undefined,
    keyword: clean(input.keyword),
    物料类别: cleanCategory(input.category),
    审核情况: audit,
  };
}

export function normalizeAuxiliaryStockReturnSummaryRow(
  row: AuxiliaryStockReturnQuerySummaryRow,
): AuxiliaryStockReturnQuerySummaryRow {
  return {
    ...row,
    退料数量: qty(row.退料数量),
  };
}

export function normalizeAuxiliaryStockReturnDetailRow(
  row: AuxiliaryStockReturnQueryDetailRow,
): AuxiliaryStockReturnQueryDetailRow {
  return {
    ...row,
    日期: shortDate(row.日期),
    数量: qty(row.数量),
  };
}
