import { describe, expect, it } from "vitest";
import { netAttendance, toYearMonth } from "../utils/payroll";

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
