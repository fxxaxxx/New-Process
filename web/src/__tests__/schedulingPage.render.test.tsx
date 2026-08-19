// @vitest-environment jsdom
// 排期页真实渲染冒烟(真 antd,非 mock):表格必须渲染出列头与数据行——防"空白表格"回归
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom 环境补齐 antd 需要的浏览器 API
beforeEach(() => {
  window.matchMedia ??= ((q: string) => ({
    matches: false, media: q, onchange: null,
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() { return false; },
  })) as unknown as typeof window.matchMedia;
  window.ResizeObserver ??= class {
    observe() {} unobserve() {} disconnect() {}
  } as unknown as typeof window.ResizeObserver;
  window.scrollTo ??= (() => {}) as never;
});

vi.mock("../api/scheduling", () => ({
  schedulingApi: {
    list: vi.fn(async () => ({
      total: 1,
      items: [{
        ID: 1, 批次ID: 1, 排期客户: "MOOSE", 状态: "在排",
        接单日期: "2026-06-23T00:00:00", 客户名称: "ROSS", 国家: "美国",
        PO号: "1053032", 客PO: "60308543", 货号: "18060", 品名: "车子+公仔",
        数量: 6000, 总箱数: 3000, 走货期: "2026-09-25T00:00:00", 验货期: "2026-09-18T00:00:00",
        来源工作表: "排期", 备注: "测试备注", 原始数据: JSON.stringify({ 货号: "18060", 柜型: "40HQ" }),
      }],
    })),
    customers: vi.fn(async () => ["MOOSE", "ZURU"]),
    summary: vi.fn(async () => [{ 排期客户: "MOOSE", 状态: "在排", 行数: 1, 数量: 6000 }]),
    batches: vi.fn(async () => []),
    files: vi.fn(async () => []),
    import: vi.fn(),
    removeBatch: vi.fn(),
  },
}));
vi.mock("../auth/PermissionContext", () => ({
  usePerms: () => ({ 生产排期: { 打开: true, 保存: true, 删除: true, 单价: true }, 采购订单: { 保存: true, 单价: true }, 生产制单: { 保存: true } }),
}));
vi.mock("../api/styles", () => ({ stylesApi: { materials: vi.fn(async () => ({ 物料: [], 报价: [] })), bomHeaders: vi.fn(async () => []) } }));
vi.mock("../api/master", () => ({ masterApi: () => ({ list: vi.fn(async () => ({ items: [], total: 0 })) }) }));
vi.mock("../api/purchaseOrders", () => ({ purchaseOrderApi: { create: vi.fn(async () => ({ 单号: "PO-X" })) } }));
vi.mock("../api/production", () => ({ productionApi: { create: vi.fn(async () => ({ 生产单号: "SC-X" })) } }));

import SchedulingPage from "../pages/scheduling/SchedulingPage";

describe("排期页真实渲染(真 antd)", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });
  afterEach(async () => {
    await act(async () => root?.unmount());
    container.remove();
  });

  it("表格渲染出列头与数据行(不空白)", async () => {
    await act(async () => { root = createRoot(container); root.render(<SchedulingPage />); });
    await act(async () => { await new Promise(r => setTimeout(r, 300)); });
    const text = container.textContent ?? "";
    // 列头
    expect(text).toContain("状态");
    expect(text).toContain("货号");
    expect(text).toContain("走货期");
    // 数据行内容
    expect(text).toContain("18060");
    expect(text).toContain("车子+公仔");
    expect(text).toContain("在排");
    expect(text).toContain("MOOSE");
    // 下单入口与视图切换
    expect(text).toContain("物料下单");
    expect(text).toContain("生产下单");
    expect(text).toContain("按排期表");
    expect(text).toContain("在排 1");
  });
});
