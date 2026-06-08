import { describe, expect, it } from "vitest";
import { sumPay } from "../utils/payLines";

describe("应付明细", () => {
  it("sumPay 合计付款金额", () => {
    expect(sumPay([{ 付款金额: 100 }, { 付款金额: 250 }])).toBe(350);
    expect(sumPay([])).toBe(0);
  });
});
