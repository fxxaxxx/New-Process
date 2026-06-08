import { describe, expect, it } from "vitest";
import { dimColumns, toYearMonth } from "../utils/monthEnd";

describe("月结工具", () => {
  it("dimColumns 按口径切换维度列", () => {
    const fg = dimColumns("成品").map(c => c.dataIndex);
    expect(fg).toContain("款号");
    expect(fg).not.toContain("物料编号");
    const sf = dimColumns("半成品").map(c => c.dataIndex);
    expect(sf).toContain("物料编号");
    expect(sf).not.toContain("款号");
  });
  it("toYearMonth 0基月份补零成 yyyyMM", () => {
    expect(toYearMonth({ year: () => 2026, month: () => 5 })).toBe("202606");
    expect(toYearMonth({ year: () => 2026, month: () => 0 })).toBe("202601");
    expect(toYearMonth(null)).toBe("");
  });
});
