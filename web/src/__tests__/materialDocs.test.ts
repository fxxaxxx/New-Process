import { describe, expect, it } from "vitest";
import { lineAmount, productionLinePatch, sumAmount, sumQty, validLines } from "../utils/materialLines";

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

describe("款号选生产制单回填", () => {
  it("productionLinePatch 仅带出生产单号+款号（忽略行内其它字段）", () => {
    const row = { 生产单号: "SC20260612001", 款号: "K100", 款式: "短袖T恤", 客户名称: "某客户" };
    expect(productionLinePatch(row)).toEqual({ 生产单号: "SC20260612001", 款号: "K100" });
  });
  it("空字段回填 undefined（不会写入空串）", () => {
    expect(productionLinePatch({})).toEqual({ 生产单号: undefined, 款号: undefined });
  });
});
