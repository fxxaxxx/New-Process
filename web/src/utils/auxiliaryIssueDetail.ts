import type { AuxiliaryIssueDetailParams, AuxiliaryIssueDetailRow } from "../api/auxiliaryIssueDetail";

export type AuxiliaryIssueDetailArrivalStatus = "未到" | "已到" | "全部";
export type AuxiliaryIssueDetailDateMode = "不选择日期" | "开单日期" | "领料日期";

export interface BuildAuxiliaryIssueDetailQueryInput {
  arrivalStatus: AuxiliaryIssueDetailArrivalStatus;
  dateMode: AuxiliaryIssueDetailDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  issueRemark?: string;
}

const trim = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const allToUndefined = (value?: string | null) => {
  const text = trim(value);
  return text && text !== "全部" ? text : undefined;
};

const d10 = (value?: string | null) => (value ? String(value).slice(0, 10) : undefined);
const qty = (value: number | null | undefined) => Number(value ?? 0);

export function buildAuxiliaryIssueDetailQuery(
  input: BuildAuxiliaryIssueDetailQueryInput,
): AuxiliaryIssueDetailParams {
  const useDate = input.dateMode !== "不选择日期";
  return {
    到货情况: input.arrivalStatus === "全部" ? undefined : input.arrivalStatus,
    keyword: trim(input.keyword),
    起: useDate ? trim(input.startDate) : undefined,
    止: useDate ? trim(input.endDate) : undefined,
    日期类型: useDate ? input.dateMode : undefined,
    领料备注: allToUndefined(input.issueRemark),
  };
}

export function normalizeAuxiliaryIssueDetailRow(
  row: AuxiliaryIssueDetailRow,
): AuxiliaryIssueDetailRow {
  return {
    ...row,
    开单日期: d10(row.开单日期),
    领料日期: d10(row.领料日期),
    需求数量: qty(row.需求数量),
    领料数量: row.领料数量 == null ? null : qty(row.领料数量),
    合计已领数量: qty(row.合计已领数量),
    未领数量: qty(row.未领数量),
  };
}

export function getAuxiliaryIssueDetailTextColor(
  row: Pick<AuxiliaryIssueDetailRow, "未领数量">,
) {
  return Number(row.未领数量 ?? 0) > 0 ? "#d000d0" : "#111111";
}
