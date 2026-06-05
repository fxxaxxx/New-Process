import { describe, expect, it } from "vitest";
import { sumPieceQty, validPieceLines } from "../utils/pieceLines";

describe("计件明细", () => {
  it("sumPieceQty 合计数量", () => {
    expect(sumPieceQty([{ 数量: 40 }, { 数量: 30 }])).toBe(70);
    expect(sumPieceQty([])).toBe(0);
  });
  it("validPieceLines 过滤缺工序/工人/数量<=0 的行", () => {
    const lines = [
      { 工序号: "02", 员工号: "E1", 数量: 40 },
      { 工序号: "", 员工号: "E1", 数量: 5 },
      { 工序号: "02", 员工号: "", 数量: 5 },
      { 工序号: "02", 员工号: "E1", 数量: 0 },
    ];
    expect(validPieceLines(lines)).toHaveLength(1);
  });
});
