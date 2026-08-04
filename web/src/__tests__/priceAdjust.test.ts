import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../api/client", () => {
  const calls: { method: string; url: string; cfg?: unknown }[] = [];
  const rec = (method: string) => (url: string, _data?: unknown, cfg?: unknown) => {
    calls.push({ method, url, cfg });
    return Promise.resolve({ data: { items: [], total: 0 } });
  };
  return { api: { get: rec("get"), post: rec("post"), put: rec("put"), delete: rec("delete"), __calls: calls } };
});

import { applyPriceAdjust, priceAdjustLinesApi, priceAdjustsApi } from "../api/priceAdjusts";
import { fmtDate, linesOfDoc, validatePriceAdjustLine } from "../utils/priceAdjust";
import { api } from "../api/client";

describe("priceAdjusts api", () => {
  beforeEach(() => { (api as unknown as { __calls: unknown[] }).__calls.length = 0; });

  it("builds master resource paths", async () => {
    await priceAdjustsApi.list(1, 10, "TJ");
    await priceAdjustLinesApi.list(1, 1000, "TJ001");
    const calls = (api as unknown as { __calls: { method: string; url: string }[] }).__calls;
    expect(calls[0]).toMatchObject({ method: "get", url: "/master/price-adjusts" });
    expect(calls[1]).toMatchObject({ method: "get", url: "/master/price-adjust-lines" });
  });

  it("apply posts to pricing apply endpoint with 报价类别 param", async () => {
    await applyPriceAdjust("TJ/001", "批发价");
    const calls = (api as unknown as { __calls: { method: string; url: string; cfg?: { params?: Record<string, string> } }[] }).__calls;
    expect(calls[0]?.method).toBe("post");
    expect(calls[0]?.url).toBe(`/master/pricing/apply/${encodeURIComponent("TJ/001")}`);
    expect(calls[0]?.cfg?.params).toEqual({ 报价类别: "批发价" });
  });
});

describe("validatePriceAdjustLine", () => {
  it("rejects empty 物料编号", () => {
    expect(validatePriceAdjustLine({ 物料编号: "" })).toBe("物料编号不能为空");
    expect(validatePriceAdjustLine({ 物料编号: "  " })).toBe("物料编号不能为空");
    expect(validatePriceAdjustLine({})).toBe("物料编号不能为空");
  });

  it("rejects negative 修改单价 and accepts valid line", () => {
    expect(validatePriceAdjustLine({ 物料编号: "M1", 修改单价: -1 })).toBe("修改单价不能为负数");
    expect(validatePriceAdjustLine({ 物料编号: "M1", 修改单价: 0 })).toBeNull();
    expect(validatePriceAdjustLine({ 物料编号: "M1" })).toBeNull();
  });
});

describe("fmtDate", () => {
  it("formats ISO strings to YYYY-MM-DD and tolerates empty", () => {
    expect(fmtDate("2026-07-28T12:34:56")).toBe("2026-07-28");
    expect(fmtDate("2026-07-28")).toBe("2026-07-28");
    expect(fmtDate(null)).toBe("");
    expect(fmtDate("")).toBe("");
  });
});

describe("linesOfDoc", () => {
  it("filters lines by exact 单号", () => {
    const lines = [{ 单号: "A1" }, { 单号: "A10" }, { 单号: null }, { 单号: "A1" }];
    expect(linesOfDoc(lines, "A1")).toEqual([{ 单号: "A1" }, { 单号: "A1" }]);
  });
});
