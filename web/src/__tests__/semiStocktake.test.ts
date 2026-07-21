import { describe, it, expect } from "vitest";
import { mergeSemiStocktakeLines, validateSemiStocktake, type STKDraftLine } from "../utils/semiStocktake";

const line = (p: Partial<STKDraftLine>): STKDraftLine => ({ key: 0, 配件编号: "", 系统数量: 0, 盘点数量: 0, ...p });

describe("mergeSemiStocktakeLines", () => {
  it("按配件编号去重，保留已存在行，新行带出系统数量且盘点数量默认等于系统数量", () => {
    const existing = [line({ key: 1, 配件编号: "A", 系统数量: 5, 盘点数量: 3 })];
    const picked = [{ 配件编号: "A" }, { 配件编号: "B" }];
    const merged = mergeSemiStocktakeLines(existing, picked, code => (code === "B" ? 7 : 0));
    expect(merged.map(l => l.配件编号)).toEqual(["A", "B"]);
    expect(merged.find(l => l.配件编号 === "A")!.盘点数量).toBe(3);
    const b = merged.find(l => l.配件编号 === "B")!;
    expect(b.系统数量).toBe(7);
    expect(b.盘点数量).toBe(7);
  });
});

describe("validateSemiStocktake", () => {
  it("至少一行有效明细", () => {
    expect(validateSemiStocktake({ 明细: [] })).toBe("请至少录入一行盘点产品。");
  });
  it("盘点数量不能为负", () => {
    expect(validateSemiStocktake({ 明细: [line({ 配件编号: "A", 盘点数量: -1 })] })).toBe("盘点数量不能为负。");
  });
  it("配件编号不重复", () => {
    expect(validateSemiStocktake({ 明细: [line({ 配件编号: "A" }), line({ 配件编号: "A" })] })).toBe("配件编号 A 在同一单据中重复。");
  });
  it("盘点数量为0通过（盈亏为负也允许）", () => {
    expect(validateSemiStocktake({ 明细: [line({ 配件编号: "A", 系统数量: 5, 盘点数量: 0 })] })).toBeNull();
  });
});
