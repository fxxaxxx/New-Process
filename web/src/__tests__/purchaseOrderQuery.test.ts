import { describe, expect, it } from "vitest";
import { ALL_CAT, buildOrderQuery } from "../utils/purchaseOrderQuery";

describe("订购单查询·参数归一化", () => {
  it("空筛选 → 全部 undefined（不下发条件）", () => {
    expect(buildOrderQuery({})).toEqual({
      供应商: undefined, keyword: undefined, 物料类别: undefined, 起: undefined, 止: undefined,
    });
  });

  it("ALL 分类节点不下发 物料类别；选中类别则下发", () => {
    expect(buildOrderQuery({ selKey: ALL_CAT }).物料类别).toBeUndefined();
    expect(buildOrderQuery({ selKey: "布料" }).物料类别).toBe("布料");
  });

  it("空串/纯空格 → undefined，有值则 trim", () => {
    expect(buildOrderQuery({ 供应商: "   ", keyword: "" })).toMatchObject({
      供应商: undefined, keyword: undefined,
    });
    expect(buildOrderQuery({ 供应商: " 恒科 ", keyword: "PET" })).toMatchObject({
      供应商: "恒科", keyword: "PET",
    });
  });

  it("日期区间透传", () => {
    expect(buildOrderQuery({ 起: "2026-03-10", 止: "2026-03-20" })).toMatchObject({
      起: "2026-03-10", 止: "2026-03-20",
    });
  });
});
