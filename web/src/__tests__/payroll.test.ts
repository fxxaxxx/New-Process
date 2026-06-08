import { describe, expect, it } from "vitest";
import { toYearMonth } from "../utils/payroll";

describe("计件归集", () => {
  it("toYearMonth dayjs(0基月) → yyyyMM", () => {
    expect(toYearMonth({ year: () => 2026, month: () => 5 })).toBe("202606");
    expect(toYearMonth({ year: () => 2026, month: () => 0 })).toBe("202601");
    expect(toYearMonth(null)).toBe("");
  });
});
