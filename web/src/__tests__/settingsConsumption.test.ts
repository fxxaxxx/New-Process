import { describe, expect, it } from "vitest";
import { minOrderPrefill, resolveDefaultSupplier } from "../utils/auxiliaryPurchaseOrder";
import { prefillDefaultWarehouse } from "../utils/plasticSettings";
import {
  DEFAULT_FEATURE_SETTINGS,
  formatPrice,
  formatQty,
  parseFeatureSettings,
  toDocCurrency,
} from "../auth/featureSettings";

describe("采购物料设置消费: 最小订量预填", () => {
  it("数量为空/0 且有最小订量时返回最小订量", () => {
    expect(minOrderPrefill(0, 100)).toBe(100);
    expect(minOrderPrefill(null, 100)).toBe(100);
    expect(minOrderPrefill(undefined, 50)).toBe(50);
  });
  it("行内已有数量时不预填", () => {
    expect(minOrderPrefill(30, 100)).toBeNull();
  });
  it("无最小订量或为 0 时不预填", () => {
    expect(minOrderPrefill(0, null)).toBeNull();
    expect(minOrderPrefill(0, undefined)).toBeNull();
    expect(minOrderPrefill(0, 0)).toBeNull();
  });
});

describe("采购物料设置消费: 默认供应商解析", () => {
  const suppliers = [
    { 供应商编号: "S001", 供应商名称: "供应商一" },
    { 供应商编号: "S002", 供应商名称: "供应商二" },
  ];
  it("按编号或名称精确匹配唯一一条", () => {
    expect(resolveDefaultSupplier(suppliers, "S001")?.供应商名称).toBe("供应商一");
    expect(resolveDefaultSupplier(suppliers, " 供应商二 ")?.供应商编号).toBe("S002");
  });
  it("空设置/匹配不到/多匹配都不预填", () => {
    expect(resolveDefaultSupplier(suppliers, null)).toBeNull();
    expect(resolveDefaultSupplier(suppliers, "不存在")).toBeNull();
    expect(resolveDefaultSupplier(
      [{ 供应商编号: "S001", 供应商名称: "重名" }, { 供应商编号: "S009", 供应商名称: "重名" }],
      "重名",
    )).toBeNull();
  });
});

describe("塑胶物料设置消费: 默认仓库预填", () => {
  it("仓库为空且有默认仓库时返回默认仓库", () => {
    expect(prefillDefaultWarehouse("", "塑胶仓")).toBe("塑胶仓");
    expect(prefillDefaultWarehouse(undefined, "塑胶仓")).toBe("塑胶仓");
    expect(prefillDefaultWarehouse("  ", "塑胶仓")).toBe("塑胶仓");
  });
  it("已填仓库不覆盖", () => {
    expect(prefillDefaultWarehouse("原料仓", "塑胶仓")).toBeNull();
  });
  it("无默认仓库不预填", () => {
    expect(prefillDefaultWarehouse("", null)).toBeNull();
    expect(prefillDefaultWarehouse("", "  ")).toBeNull();
  });
});

describe("功能设置消费: 解析与货币映射", () => {
  it("正常解析三个键", () => {
    expect(parseFeatureSettings([
      { 键: "系统.默认货币", 标签: "默认货币", 值: "rmb" },
      { 键: "系统.单价小数位", 标签: "单价小数位", 值: "3" },
      { 键: "系统.数量小数位", 标签: "数量小数位", 值: "0" },
    ])).toEqual({ 默认货币: "RMB", 单价小数位: 3, 数量小数位: 0 });
  });
  it("缺键/非法值逐项回落默认", () => {
    expect(parseFeatureSettings([])).toEqual(DEFAULT_FEATURE_SETTINGS);
    expect(parseFeatureSettings([
      { 键: "系统.默认货币", 标签: "", 值: "GBP" },
      { 键: "系统.单价小数位", 标签: "", 值: "9" },
      { 键: "系统.数量小数位", 标签: "", 值: "abc" },
    ])).toEqual(DEFAULT_FEATURE_SETTINGS);
  });
  it("货币代码 HKD 映射为单据沿用写法 HK$", () => {
    expect(toDocCurrency("HKD")).toBe("HK$");
    expect(toDocCurrency("RMB")).toBe("RMB");
    expect(toDocCurrency("USD")).toBe("USD");
  });
  it("小数位格式化助手", () => {
    const s = { 默认货币: "HKD", 单价小数位: 4, 数量小数位: 2 };
    expect(formatPrice(1.23456, s)).toBe("1.2346");
    expect(formatQty(3, s)).toBe("3.00");
    expect(formatPrice(null, s)).toBe("");
    expect(formatQty(undefined, s)).toBe("");
  });
});
