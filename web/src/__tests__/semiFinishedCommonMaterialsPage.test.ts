import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import pageSource from "../pages/semi/SemiFinishedCommonMaterialsPage.tsx?raw";
import menuSource from "../nav/menuTree.tsx?raw";
import appSource from "../App.tsx?raw";
import SemiFinishedCommonMaterialsPage from "../pages/semi/SemiFinishedCommonMaterialsPage";

const pageMock = vi.hoisted(() => ({
  buttons: [] as { label: string; disabled?: boolean; onClick?: () => void }[],
  exportCsv: vi.fn(),
  inputs: [] as {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    onSearch?: () => void;
  }[],
  list: vi.fn(),
  navigate: vi.fn(),
  perms: {} as Record<string, Record<string, boolean>>,
  printTable: vi.fn(),
  selects: [] as { value?: string; onChange?: (value: string) => void; options: { value: string; label?: string }[] }[],
  tableProps: undefined as {
    dataSource: Record<string, unknown>[];
    onRow?: (row: Record<string, unknown>) => { onClick?: () => void; onDoubleClick?: () => void };
  } | undefined,
}));

vi.mock("../auth/PermissionContext", () => ({
  usePerms: () => pageMock.perms,
}));

vi.mock("../api/semiFinishedCommonMaterials", () => ({
  semiFinishedCommonMaterialsApi: { list: pageMock.list },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => pageMock.navigate };
});

vi.mock("../utils/tableExport", () => ({
  downloadCsv: pageMock.exportCsv,
  printTable: pageMock.printTable,
}));

vi.mock("@ant-design/icons", () => ({
  CloseOutlined: () => null,
  ExportOutlined: () => null,
  PrinterOutlined: () => null,
  SearchOutlined: () => null,
  TableOutlined: () => null,
}));

vi.mock("antd", () => {
  const Button = ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => {
    pageMock.buttons.push({ label: String(children ?? ""), disabled, onClick });
    return createElement("button", { onClick }, children);
  };
  const Card = ({ children }: { children?: ReactNode }) => createElement("main", null, children);
  const Input = (props: {
    value?: string;
    onChange?: (event: { target: { value: string } }) => void;
    onSearch?: () => void;
  }) => {
    pageMock.inputs.push(props);
    return createElement("input", null);
  };
  Input.Search = Input;
  const Select = (props: { value?: string; onChange?: (value: string) => void; options: { value: string; label?: string }[] }) => {
    pageMock.selects.push(props);
    return createElement("select", null);
  };
  const Space = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const Table = (props: typeof pageMock.tableProps) => {
    pageMock.tableProps = props;
    return createElement("table", null);
  };
  const Tag = ({ children }: { children?: ReactNode }) => createElement("span", null, children);
  return { Button, Card, Input, Select, Space, Table, Tag, message: { error: vi.fn(), warning: vi.fn() } };
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
const storage = new Map<string, string>();
const testWindow = {
  document: testDocument,
  window: undefined as unknown,
  self: undefined as unknown,
  HTMLElement: TestNode,
  HTMLIFrameElement: TestNode,
  Element: TestNode,
  SVGElement: TestNode,
  Node: TestNode,
  sessionStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  },
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

const row = {
  产品货号: "A/B",
  客户: "客户一",
  产品名称: "产品一",
  产品装配名称: "产品一装配",
  库存单价: 2.5,
  配件编号: "PART-1",
  共用物料编号: "COMMON-1",
  调整审核: "未审核",
  备注内容: "备注",
};

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

function latestInput() {
  const input = pageMock.inputs.at(-1);
  if (!input) throw new Error("Missing query input");
  return input;
}

async function mountPage() {
  await act(async () => {
    root = createRoot(container as unknown as Element);
    root.render(createElement(SemiFinishedCommonMaterialsPage));
  });
  await settle();
}

beforeEach(() => {
  container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  pageMock.buttons = [];
  pageMock.exportCsv.mockReset();
  pageMock.inputs = [];
  pageMock.list.mockReset().mockResolvedValue({ items: [row], total: 1 });
  pageMock.navigate.mockReset();
  pageMock.perms = { "半成品共用物料表": { 打开: true, 单价: true, 打印: true } };
  pageMock.printTable.mockReset();
  pageMock.selects = [];
  pageMock.tableProps = undefined;
  storage.clear();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  testDocument.body.removeChild(container);
});

describe("半成品共用物料表页面", () => {
  it("uses the approved modern page, menu, and route contracts", () => {
    expect(pageSource).toContain('const MENU = "半成品共用物料表"');
    expect(pageSource).toContain("onDoubleClick");
    expect(pageSource).toContain('variant="borderless"');
    expect(menuSource).toContain('M("半成品共用物料表", "/semi-finished-common-materials", "半成品共用物料表")');
    expect(appSource).toContain('<Route path="semi-finished-common-materials" element={<SemiFinishedCommonMaterialsPage />} />');
  });

  it("runs a contains query from both the query button and Enter", async () => {
    await mountPage();

    await act(async () => { latestInput().onChange?.({ target: { value: " 产品 " } }); });
    await act(async () => { latestButton("查询").onClick?.(); });
    await settle();

    expect(pageMock.list).toHaveBeenLastCalledWith(expect.objectContaining({
      keyword: "产品",
      精确: false,
      page: 1,
      size: 50,
    }));

    await act(async () => { latestInput().onChange?.({ target: { value: " A-2 " } }); });
    await act(async () => { latestInput().onSearch?.(); });
    await settle();

    expect(pageMock.list).toHaveBeenLastCalledWith(expect.objectContaining({
      keyword: "A-2",
      精确: false,
      page: 1,
    }));
  });

  it("runs an exact server query and opens the encoded assembly detail on row double-click", async () => {
    await mountPage();

    await act(async () => { latestSelect("显示重复").onChange?.("显示重复"); });
    await act(async () => { latestButton("精确查询").onClick?.(); });
    await settle();

    expect(pageMock.list).toHaveBeenLastCalledWith(expect.objectContaining({
      重复内容: "显示重复",
      精确: true,
      page: 1,
      size: 50,
    }));

    await act(async () => { pageMock.tableProps?.onRow?.(row).onDoubleClick?.(); });
    expect(pageMock.navigate).toHaveBeenCalledWith(
      "/assembly-material-setup?款号=A%2FB&return=%2Fsemi-finished-common-materials",
    );
    expect(storage.has("semi-finished-common-materials.filters")).toBe(true);
  });

  it("provides the unified toolbar actions and delegates export, print, and close", async () => {
    await mountPage();

    expect(latestButton("表格设置").disabled).toBe(true);
    expect(latestButton("导出EXCEL").disabled).toBe(false);
    expect(latestButton("打印").disabled).toBe(false);

    await act(async () => { latestButton("导出EXCEL").onClick?.(); });
    await act(async () => { latestButton("打印").onClick?.(); });
    await act(async () => { latestButton("关闭").onClick?.(); });

    expect(pageMock.exportCsv).toHaveBeenCalledWith(
      "半成品共用物料表.csv",
      expect.any(Array),
      [row],
    );
    expect(pageMock.printTable).toHaveBeenCalledWith(
      "半成品共用物料表",
      expect.any(Array),
      [row],
    );
    const exportColumns = pageMock.exportCsv.mock.calls[0]?.[1] as { title: string }[];
    expect(exportColumns.map(column => column.title)).toEqual([
      "客户", "产品货号", "产品名称", "产品装配名称", "库存单价",
      "配件编号", "共用物料编号", "调整审核", "备注内容",
    ]);
    expect(pageMock.navigate).toHaveBeenCalledWith(-1);
  });

  it("disables export and print without print permission", async () => {
    pageMock.perms = { "半成品共用物料表": { 打开: true, 单价: true, 打印: false } };
    await mountPage();

    expect(latestButton("导出EXCEL").disabled).toBe(true);
    expect(latestButton("打印").disabled).toBe(true);
  });
});
