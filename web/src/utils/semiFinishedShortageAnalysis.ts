import type {
  SemiFinishedShortageField,
  SemiFinishedShortageQuery,
} from "../api/semiFinishedShortageAnalysis";

const shortageFields: readonly SemiFinishedShortageField[] = [
  "productCode",
  "productName",
  "customer",
  "partCode",
];

export const DEFAULT_SHORTAGE_QUERY: SemiFinishedShortageQuery = {
  field: "productCode",
  keyword: undefined,
  exact: false,
  page: 1,
  pageSize: 50,
};

function finiteOrDefault(value: number | undefined, defaultValue: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : defaultValue;
}

export function normalizeShortageQuery(input: Partial<SemiFinishedShortageQuery>): SemiFinishedShortageQuery {
  const field = shortageFields.includes(input.field as SemiFinishedShortageField)
    ? input.field as SemiFinishedShortageField
    : DEFAULT_SHORTAGE_QUERY.field;

  return {
    field,
    keyword: input.keyword?.trim() || undefined,
    exact: input.exact === true,
    page: Math.max(1, Math.trunc(finiteOrDefault(input.page, DEFAULT_SHORTAGE_QUERY.page))),
    pageSize: Math.min(200, Math.max(1, Math.trunc(finiteOrDefault(input.pageSize, DEFAULT_SHORTAGE_QUERY.pageSize)))),
  };
}

export function formatShortageQuantity(value: number): string {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 4 }).format(value ?? 0);
}

export function downloadShortageExport(blob: Blob): void {
  if (blob.size === 0) throw new Error("导出文件为空");

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "半成品欠料分析表.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
