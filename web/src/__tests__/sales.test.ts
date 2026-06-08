import { describe, expect, it } from "vitest";
import { sumQty, sumAmount, validLines } from "../utils/salesLines";

describe("销售明细", () => {
  it("sumQty 合计数量", () => {
    expect(sumQty([{ 数量: 60 }, { 数量: 40 }])).toBe(100);
    expect(sumQty([])).toBe(0);
  });
  it("sumAmount 合计金额 Σ数量×单价", () => {
    expect(sumAmount([{ 数量: 2, 单价: 5 }, { 数量: 3, 单价: 10 }])).toBe(40);
    expect(sumAmount([{ 数量: 5 }])).toBe(0);
    expect(sumAmount([])).toBe(0);
  });
  it("validLines 过滤数量<=0 的行", () => {
    expect(validLines([{ 数量: 60 }, { 数量: 0 }, { 数量: -1 }])).toHaveLength(1);
  });
});
