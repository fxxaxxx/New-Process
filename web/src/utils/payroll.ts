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

// 工资表详情动态列:固定列 + 模板项目列(列名→dataIndex,台头项目→title) + 合计列
export function payrollColumns(项目: { 列名?: string; 台头项目?: string }[]): { title: string; dataIndex: string }[] {
  const head = [
    { title: "编号", dataIndex: "编号" },
    { title: "姓名", dataIndex: "姓名" },
    { title: "部门", dataIndex: "部门" },
    { title: "职称", dataIndex: "职称" },
    { title: "基本工资", dataIndex: "基本工资" },
    { title: "计件工资", dataIndex: "计件工资" },
  ];
  const dyn = 项目
    .filter(p => p.列名)
    .map(p => ({ title: p.台头项目 ?? p.列名!, dataIndex: p.列名! }));
  const tail = [
    { title: "应发合计", dataIndex: "应发合计" },
    { title: "应扣合计", dataIndex: "应扣合计" },
    { title: "实发合计", dataIndex: "实发合计" },
  ];
  return [...head, ...dyn, ...tail];
}
