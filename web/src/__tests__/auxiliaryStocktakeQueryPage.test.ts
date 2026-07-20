import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AuxiliaryStocktakeQueryPage from "../pages/auxiliary/AuxiliaryStocktakeQueryPage";

const pageMock = vi.hoisted(() => ({
  buttons: [] as { label: string; onClick?: () => void }[],
  categories: vi.fn(),
  detail: vi.fn(),
  drawerProps: undefined as { open: boolean; 单号?: string } | undefined,
  error: vi.fn(),
  inputs: [] as { onChange: (event: { target: { value: string } }) => void }[],
  modalProps: undefined as { open: boolean; onOk: () => void; onCancel: () => void } | undefined,
  rangePickers: [] as { onChange?: (value: [unknown, unknown] | null) => void }[],
  selects: [] as { value: string; onChange: (value: string) => void; options: { value: string }[] }[],
  summary: vi.fn(),
  tableProps: undefined as {
    dataSource: Record<string, unknown>[];
    loading?: boolean;
    onRow?: (row: Record<string, unknown>) => { onDoubleClick?: () => void };
  } | undefined,
  tabsProps: undefined as { labels: string[]; onChange: (key: string) => void } | undefined,
}));

vi.mock("../auth/PermissionContext", () => ({
  usePerms: () => ({ "辅料盘点查询": { 打开: true } }),
}));

vi.mock("../api/auxiliaryStocktakeQuery", () => ({
  auxiliaryStocktakeQueryApi: {
    summary: pageMock.summary,
    detail: pageMock.detail,
  },
}));

vi.mock("../api/materialMaster", () => ({
  materialMasterApi: { categories: pageMock.categories },
}));

vi.mock("../pages/auxiliary/AuxiliaryReportLayout", () => ({
  AuxiliaryReportLayout: ({ children }: { children?: ReactNode }) => createElement("main", null, children),
  auxiliaryReportFilterPanelStyle: {},
  auxiliaryReportFilterRowStyle: {},
}));

vi.mock("../pages/auxiliary/AuxiliaryStocktakeQueryDetailDrawer", () => ({
  default: (props: { open: boolean; 单号?: string }) => {
    pageMock.drawerProps = props;
    return createElement("aside", null);
  },
}));

vi.mock("@ant-design/icons", () => ({ SearchOutlined: () => null }));

vi.mock("antd", () => {
  const Button = ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => {
    pageMock.buttons.push({ label: String(children ?? ""), onClick });
    return createElement("button", { onClick }, children);
  };
  const DatePicker = Object.assign(() => createElement("span", null), {
    RangePicker: (props: { onChange?: (value: [unknown, unknown] | null) => void }) => {
      pageMock.rangePickers.push(props);
      return createElement("span", null);
    },
  });
  const Input = (props: { onChange: (event: { target: { value: string } }) => void }) => {
    pageMock.inputs.push(props);
    return createElement("input", null);
  };
  const Modal = ({ open, title, children, onOk, onCancel }: {
    open: boolean;
    title?: ReactNode;
    children?: ReactNode;
    onOk: () => void;
    onCancel: () => void;
  }) => {
    pageMock.modalProps = { open, onOk, onCancel };
    return open ? createElement("section", null, title, children) : null;
  };
  const Select = (props: { value: string; onChange: (value: string) => void; options: { value: string }[] }) => {
    pageMock.selects.push(props);
    return createElement("select", null);
  };
  const Space = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const Table = (props: typeof pageMock.tableProps) => {
    pageMock.tableProps = props;
    return createElement("table", null);
  };
  const Tabs = ({ activeKey, items, onChange }: {
    activeKey: string;
    items: { key: string; label: string; children?: ReactNode }[];
    onChange: (key: string) => void;
  }) => {
    pageMock.tabsProps = { labels: items.map(item => item.label), onChange };
    return createElement("section", null, items.find(item => item.key === activeKey)?.children);
  };
  return { Button, DatePicker, Input, Modal, Select, Space, Table, Tabs, message: { error: pageMock.error } };
});

class TestNode {
  nodeType = 1;
  nodeName: string;
  tagName: string;
  ownerDocument: TestDocument;
  parentNode: TestNode | null = null;
  childNodes: TestNode[] = [];
  style = { setProperty: () => undefined, removeProperty: () => undefined };
  private textValue = "";

  constructor(nodeName: string, ownerDocument: TestDocument) {
    this.nodeName = nodeName.toUpperCase();
    this.tagName = nodeName.toLowerCase();
    this.ownerDocument = ownerDocument;
  }

  appendChild<T extends TestNode>(child: T): T { child.parentNode = this; this.childNodes.push(child); return child; }
  insertBefore<T extends TestNode>(child: T, before: TestNode | null): T {
    child.parentNode = this;
    const index = before ? this.childNodes.indexOf(before) : -1;
    if (index < 0) this.childNodes.push(child); else this.childNodes.splice(index, 0, child);
    return child;
  }
  removeChild<T extends TestNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  addEventListener() { /* React event delegation only needs this surface. */ }
  removeEventListener() { /* React event delegation only needs this surface. */ }
  setAttribute() { /* React initial properties only. */ }
  removeAttribute() { /* React initial properties only. */ }
  contains(node: TestNode | null): boolean { return node === this || this.childNodes.some(child => child.contains(node)); }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild(): TestNode | null { return this.childNodes.at(-1) ?? null; }
  get textContent() { return this.textValue + this.childNodes.map(child => child.textContent).join(""); }
  set textContent(value: string | null) { this.textValue = value ?? ""; this.childNodes = []; }
}

class TestText extends TestNode {
  nodeType = 3;
  constructor(value: string, ownerDocument: TestDocument) { super("#text", ownerDocument); this.textContent = value; }
}

class TestDocument extends TestNode {
  nodeType = 9;
  documentElement: TestNode;
  body: TestNode;
  activeElement: TestNode | null = null;

  constructor() {
    super("#document", undefined as unknown as TestDocument);
    this.ownerDocument = this;
    this.documentElement = new TestNode("html", this);
    this.body = new TestNode("body", this);
    this.documentElement.appendChild(this.body);
  }

  createElement(name: string) { return new TestNode(name, this); }
  createTextNode(value: string) { return new TestText(value, this); }
  createComment(value: string) { return new TestText(value, this); }
  addEventListener() { /* no-op */ }
  removeEventListener() { /* no-op */ }
}

const testDocument = new TestDocument();
const testWindow = {
  document: testDocument,
  window: undefined as unknown,
  self: undefined as unknown,
  HTMLElement: TestNode,
  HTMLIFrameElement: TestNode,
  Element: TestNode,
  SVGElement: TestNode,
  Node: TestNode,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
};
testWindow.window = testWindow;
testWindow.self = testWindow;
Object.assign(globalThis, {
  document: testDocument,
  window: testWindow,
  HTMLElement: TestNode,
  HTMLIFrameElement: TestNode,
  Element: TestNode,
  SVGElement: TestNode,
  Node: TestNode,
  IS_REACT_ACT_ENVIRONMENT: true,
});

let root: Root | undefined;
let container: TestNode;

const summaryRows = [
  { 物料编号: "FL-001", 物料名称: "透明胶纸", 规格: "2.5*90Y" },
  { 物料编号: "FL-002", 物料名称: "螺丝", 规格: "M3" },
];
const detailRows = [{ ...summaryRows[0], 单号: "PD-001", 日期: "2026-07-01" }];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function latestSelect(option: string) {
  const select = [...pageMock.selects].reverse().find(item => item.options.some(itemOption => itemOption.value === option));
  if (!select) throw new Error(`Missing Select option: ${option}`);
  return select;
}

function latestButton(label: string) {
  const button = [...pageMock.buttons].reverse().find(item => item.label === label);
  if (!button) throw new Error(`Missing Button: ${label}`);
  return button;
}

beforeEach(() => {
  container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  pageMock.categories.mockResolvedValue([{ 类别: "五金", 数量: 2 }]);
  pageMock.summary.mockResolvedValue(summaryRows);
  pageMock.detail.mockResolvedValue(detailRows);
  pageMock.buttons = [];
  pageMock.drawerProps = undefined;
  pageMock.error.mockReset();
  pageMock.inputs = [];
  pageMock.modalProps = undefined;
  pageMock.rangePickers = [];
  pageMock.selects = [];
  pageMock.summary.mockClear();
  pageMock.detail.mockClear();
  pageMock.categories.mockClear();
  pageMock.tableProps = undefined;
  pageMock.tabsProps = undefined;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  testDocument.body.removeChild(container);
});

describe("辅料盘点查询页面", () => {
  it("mounts summary first, loads real categories, filters selected fields, and opens the detail drawer", async () => {
    await act(async () => {
      root = createRoot(container as unknown as Element);
      root.render(createElement(AuxiliaryStocktakeQueryPage));
    });
    await settle();

    expect(pageMock.summary).toHaveBeenCalledTimes(1);
    expect(pageMock.detail).not.toHaveBeenCalled();
    expect(pageMock.categories).toHaveBeenCalledTimes(1);

    await act(async () => { latestSelect("五金").onChange("五金"); });
    await settle();
    expect(pageMock.summary).toHaveBeenLastCalledWith(expect.objectContaining({ 物料类别: "五金" }));

    await act(async () => { latestSelect("辅料名称").onChange("辅料名称"); });
    await act(async () => { pageMock.inputs[0]?.onChange({ target: { value: "  螺丝  " } }); });
    await settle();
    expect(pageMock.tableProps?.dataSource).toEqual([summaryRows[1]]);

    await act(async () => { pageMock.tabsProps?.onChange("detail"); });
    await settle();
    expect(pageMock.detail).toHaveBeenCalled();
    await act(async () => { pageMock.tableProps?.onRow?.(detailRows[0]).onDoubleClick?.(); });
    expect(pageMock.drawerProps).toMatchObject({ open: true, 单号: "PD-001" });
  });

  it("keeps the newest category request data and loading state when an older request finishes later", async () => {
    const older = deferred<typeof summaryRows>();
    const newerRows = [{ 物料编号: "NEW", 物料名称: "新结果", 规格: "N" }];
    const newer = deferred<typeof newerRows>();
    pageMock.summary.mockReset()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);

    await act(async () => {
      root = createRoot(container as unknown as Element);
      root.render(createElement(AuxiliaryStocktakeQueryPage));
    });
    await settle();
    expect(pageMock.tableProps?.loading).toBe(true);

    await act(async () => { latestSelect("五金").onChange("五金"); });
    await settle();
    expect(pageMock.summary).toHaveBeenCalledTimes(2);

    await act(async () => { older.resolve(summaryRows); await older.promise; });
    expect(pageMock.tableProps?.dataSource).toEqual([]);
    expect(pageMock.tableProps?.loading).toBe(true);

    await act(async () => { newer.resolve(newerRows); await newer.promise; });
    expect(pageMock.tableProps?.dataSource).toEqual(newerRows);
    expect(pageMock.tableProps?.loading).toBe(false);
  });

  it("does not show an error from a stale request", async () => {
    const older = deferred<typeof summaryRows>();
    const newer = deferred<typeof summaryRows>();
    pageMock.summary.mockReset()
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);

    await act(async () => {
      root = createRoot(container as unknown as Element);
      root.render(createElement(AuxiliaryStocktakeQueryPage));
    });
    await settle();
    await act(async () => { latestSelect("五金").onChange("五金"); });
    await settle();

    await act(async () => { older.reject(new Error("stale")); await older.promise.catch(() => undefined); });
    expect(pageMock.error).not.toHaveBeenCalled();
    expect(pageMock.tableProps?.loading).toBe(true);

    await act(async () => { newer.resolve(summaryRows); await newer.promise; });
    expect(pageMock.tableProps?.loading).toBe(false);
  });

  it("provides date type, exact query, advanced query, and approved tab labels with working actions", async () => {
    await act(async () => {
      root = createRoot(container as unknown as Element);
      root.render(createElement(AuxiliaryStocktakeQueryPage));
    });
    await settle();

    expect(latestSelect("日期").value).toBe("日期");
    expect(pageMock.tabsProps?.labels).toEqual(["汇总查询", "明细查询"]);

    const beforeExact = pageMock.summary.mock.calls.length;
    await act(async () => { latestButton("精确查询").onClick?.(); });
    await settle();
    expect(pageMock.summary).toHaveBeenCalledTimes(beforeExact + 1);

    await act(async () => { latestButton("高级查询").onClick?.(); });
    expect(pageMock.modalProps?.open).toBe(true);
    const beforeAdvancedConfirm = pageMock.summary.mock.calls.length;
    await act(async () => {
      latestSelect("五金").onChange("五金");
      latestSelect("已审核").onChange("已审核");
      pageMock.inputs.at(-1)?.onChange({ target: { value: "ADV-001" } });
    });
    expect(pageMock.summary).toHaveBeenCalledTimes(beforeAdvancedConfirm);

    await act(async () => { pageMock.modalProps?.onOk(); });
    await settle();
    expect(pageMock.summary).toHaveBeenLastCalledWith(expect.objectContaining({
      keyword: "ADV-001",
      物料类别: "五金",
      审核情况: "已审核",
    }));
  });
});
