import { describe, expect, it } from "vitest";
import { netAttendance, payrollColumns, toYearMonth, validWageItems } from "../utils/payroll";

describe("计件归集", () => {
  it("toYearMonth dayjs(0基月) → yyyyMM", () => {
    expect(toYearMonth({ year: () => 2026, month: () => 5 })).toBe("202606");
    expect(toYearMonth({ year: () => 2026, month: () => 0 })).toBe("202601");
    expect(toYearMonth(null)).toBe("");
  });
});

describe("出勤汇总", () => {
  it("netAttendance 应出勤 - 缺勤", () => {
    expect(netAttendance(26, 2)).toBe(24);
    expect(netAttendance(26, 0)).toBe(26);
    expect(netAttendance(26, 26)).toBe(0);
  });
});

describe("工资模板", () => {
  it("validWageItems 全部台头项目非空且无重复 → true", () => {
    expect(validWageItems([{ 台头项目: "底薪" }, { 台头项目: "全勤" }])).toBe(true);
  });
  it("validWageItems 存在空台头项目 → false", () => {
    expect(validWageItems([{ 台头项目: "底薪" }, { 台头项目: "" }])).toBe(false);
    expect(validWageItems([{ 台头项目: "底薪" }, {}])).toBe(false);
  });
  it("validWageItems 台头项目重复 → false", () => {
    expect(validWageItems([{ 台头项目: "底薪" }, { 台头项目: "底薪" }])).toBe(false);
  });
});

describe("工资表", () => {
  it("payrollColumns 固定列 + 动态项目列(台头项目→title,列名→dataIndex) + 合计列", () => {
    const cols = payrollColumns([
      { 列名: "ZG01", 台头项目: "全勤奖" },
      { 列名: "ZG02", 台头项目: "社保" },
    ]);
    const dataIndexes = cols.map(c => c.dataIndex);
    expect(dataIndexes).toEqual([
      "编号", "姓名", "部门", "职称", "基本工资", "计件工资",
      "ZG01", "ZG02",
      "应发合计", "应扣合计", "实发合计",
    ]);
    const zg01 = cols.find(c => c.dataIndex === "ZG01");
    expect(zg01?.title).toBe("全勤奖");
  });
  it("payrollColumns 无列名项目被过滤", () => {
    const cols = payrollColumns([{ 台头项目: "无列名" }]);
    expect(cols.map(c => c.dataIndex)).not.toContain(undefined);
    expect(cols.length).toBe(9);
  });
});
