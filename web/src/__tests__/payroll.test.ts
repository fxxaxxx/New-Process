import { describe, expect, it } from "vitest";
import { netAttendance, toYearMonth, validWageItems } from "../utils/payroll";

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
