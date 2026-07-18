import { describe, it, expect } from "vitest";
import { mergeSemiWarehouseReturnLines, validateSemiWarehouseReturn, type SWRDraftLine } from "../utils/semiWarehouseReturn";

const line = (p: Partial<SWRDraftLine>): SWRDraftLine => ({ key: 0, 配件编号: "", 数量: 0, ...p });

describe("mergeSemiWarehouseReturnLines", () => {
  it("按配件编号去重，保留已存在数量，追加新产品", () => {
    const existing = [line({ key: 1, 配件编号: "A", 数量: 5 })];
    const picked = [{ 配件编号: "A" }, { 配件编号: "B", 库存单价: 2 }];
    const merged = mergeSemiWarehouseReturnLines(existing, picked);
    expect(merged.map(l => l.配件编号)).toEqual(["A", "B"]);
    expect(merged.find(l => l.配件编号 === "A")!.数量).toBe(5);
  });
});

describe("validateSemiWarehouseReturn", () => {
  it("入仓单号必选", () => {
    expect(validateSemiWarehouseReturn({ 入仓单号: "", 明细: [line({ 配件编号: "A", 数量: 1 })] })).toBe("请先选择原入仓单号。");
  });
  it("至少一行有效明细", () => {
    expect(validateSemiWarehouseReturn({ 入仓单号: "R1", 明细: [] })).toBe("请至少录入一行退仓产品。");
  });
  it("数量必须大于0", () => {
    expect(validateSemiWarehouseReturn({ 入仓单号: "R1", 明细: [line({ 配件编号: "A", 数量: 0 })] })).toBe("退仓数量必须大于 0。");
  });
  it("配件编号不重复", () => {
    expect(validateSemiWarehouseReturn({ 入仓单号: "R1", 明细: [line({ 配件编号: "A", 数量: 1 }), line({ 配件编号: "A", 数量: 2 })] })).toBe("配件编号 A 在同一单据中重复。");
  });
  it("通过返回 null", () => {
    expect(validateSemiWarehouseReturn({ 入仓单号: "R1", 明细: [line({ 配件编号: "A", 数量: 1 })] })).toBeNull();
  });
});
