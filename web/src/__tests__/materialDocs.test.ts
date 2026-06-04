import { describe, expect, it } from "vitest";
import { lineAmount, sumAmount, sumQty, validLines } from "../utils/materialLines";

describe("物料明细合计", () => {
  it("lineAmount = 数量×单价(单价空记0)", () => {
    expect(lineAmount({ 数量: 100, 单价: 10 })).toBe(1000);
    expect(lineAmount({ 数量: 5 })).toBe(0);
  });
  it("sumQty / sumAmount", () => {
    const lines = [{ 数量: 100, 单价: 10 }, { 数量: 200, 单价: 0.5 }];
    expect(sumQty(lines)).toBe(300);
    expect(sumAmount(lines)).toBe(1100);
  });
  it("validLines 过滤无物料编号或数量<=0 的行", () => {
    const lines = [
      { 物料编号: "M1", 数量: 1 }, { 物料编号: "", 数量: 5 }, { 物料编号: "M2", 数量: 0 },
    ];
    expect(validLines(lines)).toHaveLength(1);
    expect(validLines(lines)[0].物料编号).toBe("M1");
  });
});
