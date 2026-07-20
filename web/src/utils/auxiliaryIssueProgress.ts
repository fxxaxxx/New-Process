import type {
  AuxiliaryIssueProgressParams,
  AuxiliaryIssueProgressRow as ApiAuxiliaryIssueProgressRow,
} from "../api/auxiliaryIssueProgress";

export const AUXILIARY_ISSUE_PROGRESS_CATEGORY = "辅料资料";

export type AuxiliaryIssueArrivalStatus = "未到" | "已到" | "全部";
export type AuxiliaryIssueProgressDateMode = "不选择日期" | "开单日期" | "领料日期";

export interface AuxiliaryIssueProgressQueryInput {
  arrivalStatus: AuxiliaryIssueArrivalStatus;
  dateMode: AuxiliaryIssueProgressDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  issueRemark?: string;
}

export type AuxiliaryIssueProgressRow = ApiAuxiliaryIssueProgressRow;

const trim = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const allToUndefined = (value?: string | null) => {
  const text = trim(value);
  return text && text !== "全部" ? text : undefined;
};

const d10 = (value?: string | null) => (value ? String(value).slice(0, 10) : undefined);

export function buildAuxiliaryIssueProgressQuery(
  input: AuxiliaryIssueProgressQueryInput,
): AuxiliaryIssueProgressParams {
  const useDate = input.dateMode !== "不选择日期";
  return {
    物料类别: AUXILIARY_ISSUE_PROGRESS_CATEGORY,
    到货情况: input.arrivalStatus === "全部" ? undefined : input.arrivalStatus,
    日期类型: useDate ? input.dateMode : undefined,
    起: useDate ? trim(input.startDate) : undefined,
    止: useDate ? trim(input.endDate) : undefined,
    keyword: trim(input.keyword),
    领料备注: allToUndefined(input.issueRemark),
  };
}

export function normalizeAuxiliaryIssueProgressRow(
  row: ApiAuxiliaryIssueProgressRow,
): AuxiliaryIssueProgressRow {
  return {
    开单日期: d10(row.开单日期),
    装配生产单号: row.装配生产单号,
    领料备注: row.领料备注,
    辅料编号: row.辅料编号,
    辅料名称: row.辅料名称,
    规格: row.规格,
    单位: row.单位,
    需求数量: row.需求数量 ?? 0,
    已领数量: row.已领数量 ?? 0,
    未领数量: row.未领数量 ?? 0,
    操作员: row.操作员,
  };
}

export function getAuxiliaryIssueProgressTextColor(
  row: Pick<AuxiliaryIssueProgressRow, "未领数量">,
) {
  return Number(row.未领数量 ?? 0) > 0 ? "#d000d0" : "#111111";
}
