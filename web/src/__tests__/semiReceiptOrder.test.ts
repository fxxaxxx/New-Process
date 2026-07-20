import { describe, expect, it } from "vitest";
import {
  mergeSemiReceiptProducts,
  summarizeSemiReceiptLines,
  validateSemiReceipt,
} from "../utils/semiReceiptOrder";

describe("semi receipt order helpers", () => {
  it("merges selected products without duplicating the same part and product", () => {
    const result = mergeSemiReceiptProducts(
      [{ key: 1, 配件编号: "AAA0001", 产品货号: "9215A", 数量: 5 }],
      [
        { 配件编号: "AAA0001", 产品货号: "9215A", 产品装配名称: "已有配件" },
        { 配件编号: "AAA0002", 产品货号: "9215B", 产品装配名称: "新增配件", 客户: "ZURU" },
      ],
    );

    expect(result).toHaveLength(2);
    expect(result[0].数量).toBe(5);
    expect(result[1]).toMatchObject({ 配件编号: "AAA0002", 产品货号: "9215B", 客户: "ZURU", 数量: 0 });
  });

  it("summarizes receipt quantity by part number and assembly name", () => {
    const result = summarizeSemiReceiptLines([
      { key: 1, 配件编号: "AAA0001", 产品货号: "9215A", 产品装配名称: "彩盒", 数量: 10 },
      { key: 2, 配件编号: "AAA0001", 产品货号: "9215B", 产品装配名称: "彩盒", 数量: 6 },
      { key: 3, 配件编号: "AAA0002", 产品货号: "9215C", 产品装配名称: "胶袋", 数量: 4 },
    ]);

    expect(result).toEqual([
      { key: "AAA0001|彩盒", 序号: 1, 配件编号: "AAA0001", 产品装配名称: "彩盒", 入仓数量: 16 },
      { key: "AAA0002|胶袋", 序号: 2, 配件编号: "AAA0002", 产品装配名称: "胶袋", 入仓数量: 4 },
    ]);
  });

  it("requires supplier, warehouse and at least one positive line", () => {
    expect(validateSemiReceipt({ 供应商名称: "", 仓库: "", 明细: [] })).toBe("请选择供应商");
    expect(validateSemiReceipt({ 供应商名称: "加工厂", 仓库: "", 明细: [] })).toBe("请选择收货仓库");
    expect(validateSemiReceipt({ 供应商名称: "加工厂", 仓库: "半成品仓", 明细: [{ key: 1, 配件编号: "AAA", 产品货号: "9215", 数量: 0 }] })).toBe("请至少录入一行数量大于 0 的明细");
    expect(validateSemiReceipt({ 供应商名称: "加工厂", 仓库: "半成品仓", 明细: [{ key: 1, 配件编号: "AAA", 产品货号: "9215", 数量: 1 }] })).toBeNull();
  });
});
