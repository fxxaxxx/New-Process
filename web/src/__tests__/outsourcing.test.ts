import { describe, expect, it } from "vitest";
import { sumQty, validOutsourceLines } from "../utils/outsourceLines";

describe("发外明细", () => {
  it("sumQty 合计数量", () => {
    expect(sumQty([{ 数量: 60 }, { 数量: 40 }])).toBe(100);
    expect(sumQty([])).toBe(0);
  });
  it("validOutsourceLines 过滤缺加工项目/数量<=0 的行", () => {
    const lines = [
      { 加工项目: "车缝", 数量: 60 },
      { 加工项目: "", 数量: 5 },
      { 加工项目: "车缝", 数量: 0 },
    ];
    expect(validOutsourceLines(lines)).toHaveLength(1);
  });
});
