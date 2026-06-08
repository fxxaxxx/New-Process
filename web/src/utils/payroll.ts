// dayjs(month()为0基) → yyyyMM
export function toYearMonth(d: { year: () => number; month: () => number } | null): string {
  if (!d) return "";
  const y = d.year();
  const m = d.month() + 1;
  return `${y}${String(m).padStart(2, "0")}`;
}
