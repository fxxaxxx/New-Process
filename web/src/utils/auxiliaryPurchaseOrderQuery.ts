import type {
  AuxiliaryPurchaseOrderQueryDetailRow,
  AuxiliaryPurchaseOrderQueryParams,
  AuxiliaryPurchaseOrderQuerySummaryRow,
} from "../api/auxiliaryPurchaseOrderQuery";

export type AuxiliaryPurchaseOrderDateMode = "不选择日期" | "订货日期" | "交货日期";
export type AuxiliaryPurchaseOrderAuditStatus = "全部" | "已审核" | "未审核";

export interface BuildAuxiliaryPurchaseOrderQueryInput {
  dateMode: AuxiliaryPurchaseOrderDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  category?: string;
  groupBySupplier: boolean;
  auditStatus?: AuxiliaryPurchaseOrderAuditStatus;
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

export function buildAuxiliaryPurchaseOrderQuery(
  input: BuildAuxiliaryPurchaseOrderQueryInput,
): AuxiliaryPurchaseOrderQueryParams {
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

export function normalizeAuxiliaryPurchaseOrderSummaryRow(
  row: AuxiliaryPurchaseOrderQuerySummaryRow,
): AuxiliaryPurchaseOrderQuerySummaryRow {
  return {
    ...row,
    订货数量: qty(row.订货数量),
  };
}

export function normalizeAuxiliaryPurchaseOrderDetailRow(
  row: AuxiliaryPurchaseOrderQueryDetailRow,
): AuxiliaryPurchaseOrderQueryDetailRow {
  return {
    ...row,
    日期: shortDate(row.日期),
    交货日期: shortDate(row.交货日期),
    数量: qty(row.数量),
  };
}
