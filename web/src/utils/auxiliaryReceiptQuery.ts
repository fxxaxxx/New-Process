import type {
  AuxiliaryReceiptQueryDetailRow,
  AuxiliaryReceiptQueryParams,
  AuxiliaryReceiptQuerySummaryRow,
} from "../api/auxiliaryReceiptQuery";

export type AuxiliaryReceiptDateMode = "不选择日期" | "日期";
export type AuxiliaryReceiptAuditStatus = "全部" | "已审核" | "未审核";

export interface BuildAuxiliaryReceiptQueryInput {
  dateMode: AuxiliaryReceiptDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  category?: string;
  groupBySupplier: boolean;
  auditStatus?: AuxiliaryReceiptAuditStatus;
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

export function buildAuxiliaryReceiptQuery(
  input: BuildAuxiliaryReceiptQueryInput,
): AuxiliaryReceiptQueryParams {
  const useDate = input.dateMode !== "不选择日期";
  const audit = input.auditStatus && input.auditStatus !== "全部" ? input.auditStatus : undefined;
  return {
    起: useDate ? input.startDate : undefined,
    止: useDate ? input.endDate : undefined,
    日期类型: useDate ? input.dateMode : undefined,
    keyword: clean(input.keyword),
    物料类别: cleanCategory(input.category),
    按供应商: input.groupBySupplier,
    审核情况: audit,
  };
}

export function normalizeAuxiliaryReceiptSummaryRow(
  row: AuxiliaryReceiptQuerySummaryRow,
): AuxiliaryReceiptQuerySummaryRow {
  return {
    ...row,
    入仓数量: qty(row.入仓数量),
  };
}

export function normalizeAuxiliaryReceiptDetailRow(
  row: AuxiliaryReceiptQueryDetailRow,
): AuxiliaryReceiptQueryDetailRow {
  return {
    ...row,
    日期: shortDate(row.日期),
    数量: qty(row.数量),
  };
}
