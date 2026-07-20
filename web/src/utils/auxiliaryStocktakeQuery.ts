import type { AuxiliaryStocktakeQueryParams } from "../api/auxiliaryStocktakeQuery";

export type AuxiliaryStocktakeAudit = "全部" | "已审核" | "未审核";

export interface BuildAuxiliaryStocktakeQueryInput {
  start?: string;
  end?: string;
  keyword?: string;
  category?: string;
  audit?: AuxiliaryStocktakeAudit;
}

const clean = (value?: string) => {
  const text = value?.trim();
  return text || undefined;
};

export function buildAuxiliaryStocktakeQuery(
  input: BuildAuxiliaryStocktakeQueryInput = {},
): AuxiliaryStocktakeQueryParams {
  const params: AuxiliaryStocktakeQueryParams = {};
  const start = clean(input.start);
  const end = clean(input.end);
  const keyword = clean(input.keyword);
  const category = clean(input.category);
  const audit = clean(input.audit);

  if (start) params.起 = start;
  if (end) params.止 = end;
  if (keyword) params.keyword = keyword;
  if (category && category !== "全部") params.物料类别 = category;
  if (audit && audit !== "全部") params.审核情况 = audit;

  return params;
}
