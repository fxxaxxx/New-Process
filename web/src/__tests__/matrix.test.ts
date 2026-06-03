import { describe, expect, it } from "vitest";
import { cellKey, linesToMatrix, matrixToLines, sumMatrix } from "../utils/matrix";

describe("色×码数量矩阵", () => {
  it("matrixToLines 只导出数量>0的格子,保持 颜色×尺码 顺序", () => {
    const qty = { [cellKey("黑色", "S")]: 10, [cellKey("黑色", "M")]: 0, [cellKey("白色", "L")]: 5 };
    const lines = matrixToLines(["黑色", "白色"], ["S", "M", "L"], qty);
    expect(lines).toEqual([
      { 颜色: "黑色", 尺码: "S", 数量: 10 },
      { 颜色: "白色", 尺码: "L", 数量: 5 },
    ]);
  });

  it("sumMatrix 合计全部格子", () => {
    const qty = { [cellKey("黑色", "S")]: 10, [cellKey("白色", "L")]: 5 };
    expect(sumMatrix(qty)).toBe(15);
  });

  it("linesToMatrix 反向转换(详情页回显)", () => {
    const qty = linesToMatrix([
      { 颜色: "黑色", 尺码: "S", 数量: 10 },
      { 颜色: "白色", 尺码: "L", 数量: 5 },
    ]);
    expect(qty[cellKey("黑色", "S")]).toBe(10);
    expect(qty[cellKey("白色", "L")]).toBe(5);
  });
});
