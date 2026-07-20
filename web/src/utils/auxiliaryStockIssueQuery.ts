import type {
  AuxiliaryStockIssueQueryDetailRow,
  AuxiliaryStockIssueQueryParams,
  AuxiliaryStockIssueQuerySummaryRow,
} from "../api/auxiliaryStockIssueQuery";

export type AuxiliaryStockIssueDateMode = "不选择日期" | "日期";
export type AuxiliaryStockIssueAuditStatus = "全部" | "已审核" | "未审核";

export interface BuildAuxiliaryStockIssueQueryInput {
  dateMode: AuxiliaryStockIssueDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  category?: string;
  issueRemark?: string;
  maker?: string;
  auditStatus?: AuxiliaryStockIssueAuditStatus;
}

const clean = (value?: string) => {
  const text = value?.trim();
  return text ? text : undefined;
};

const cleanAll = (value?: string) => {
  const text = clean(value);
  return text && text !== "全部" && text !== "<全部>" ? text : undefined;
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

export function buildAuxiliaryStockIssueQuery(
  input: BuildAuxiliaryStockIssueQueryInput,
): AuxiliaryStockIssueQueryParams {
  const useDate = input.dateMode !== "不选择日期";
  const audit = input.auditStatus && input.auditStatus !== "全部" ? input.auditStatus : undefined;
  return {
    起: useDate ? input.startDate : undefined,
    止: useDate ? input.endDate : undefined,
    日期类型: useDate ? input.dateMode : undefined,
    keyword: clean(input.keyword),
    物料类别: cleanCategory(input.category),
    领料备注: cleanAll(input.issueRemark),
    制单人: clean(input.maker),
    审核情况: audit,
  };
}

export function normalizeAuxiliaryStockIssueSummaryRow(
  row: AuxiliaryStockIssueQuerySummaryRow,
): AuxiliaryStockIssueQuerySummaryRow {
  return {
    ...row,
    开单日期: shortDate(row.开单日期),
    领料数量: qty(row.领料数量),
  };
}

export function normalizeAuxiliaryStockIssueDetailRow(
  row: AuxiliaryStockIssueQueryDetailRow,
): AuxiliaryStockIssueQueryDetailRow {
  return {
    ...row,
    开单日期: shortDate(row.开单日期),
    日期: shortDate(row.日期),
    审核日期: shortDate(row.审核日期),
    数量: qty(row.数量),
  };
}
