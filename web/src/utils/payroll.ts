// dayjs(month()为0基) → yyyyMM
export function toYearMonth(d: { year: () => number; month: () => number } | null): string {
  if (!d) return "";
  const y = d.year();
  const m = d.month() + 1;
  return `${y}${String(m).padStart(2, "0")}`;
}

// 实出勤 = 应出勤 - 缺勤
export function netAttendance(应出勤: number, 缺勤: number): number {
  return 应出勤 - 缺勤;
}

// 工资模板明细校验:每行台头项目非空且无重复
export function validWageItems(items: { 台头项目?: string }[]): boolean {
  const names = items.map(i => (i.台头项目 ?? "").trim());
  if (names.some(n => n === "")) return false;
  return new Set(names).size === names.length;
}
