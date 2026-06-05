import { describe, expect, it } from "vitest";
import { sumQty, validLines } from "../utils/finishedLines";

describe("成品明细", () => {
  it("sumQty 合计数量", () => {
    expect(sumQty([{ 数量: 60 }, { 数量: 40 }])).toBe(100);
    expect(sumQty([])).toBe(0);
  });
  it("validLines 过滤数量<=0 的行", () => {
    expect(validLines([{ 数量: 60 }, { 数量: 0 }, { 数量: -1 }])).toHaveLength(1);
  });
});
