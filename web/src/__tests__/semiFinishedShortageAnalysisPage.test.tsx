import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SemiFinishedShortageAnalysisPage from "../pages/semi/SemiFinishedShortageAnalysisPage";

const pageMock = vi.hoisted(() => ({
  buttons: [] as { label: string; disabled?: boolean; onClick?: () => void }[],
  download: vi.fn(),
  error: vi.fn(),
  exportFile: vi.fn(),
  inputs: [] as { onChange?: (event: { target: { value: string } }) => void; value?: string }[],
  list: vi.fn(),
  navigate: vi.fn(),
  perms: { "半成品欠料分析表": { 打开: true, 打印: true } } as Record<string, Record<string, boolean>>,
  print: vi.fn(),
  selects: [] as { value?: string; onChange?: (value: string) => void; options?: { value: string; label: string }[] }[],
  tableProps: undefined as {
    columns: { title: string; render?: (value: number) => ReactNode }[];
    dataSource: Record<string, unknown>[];
    loading?: boolean;
    locale?: { emptyText?: ReactNode };
    pagination?: { current?: number; pageSize?: number; total?: number; onChange?: (page: number, pageSize: number) => void };
    rowKey?: (row: Record<string, unknown>, index?: number) => string;
  } | undefined,
}));

vi.mock("../auth/PermissionContext", () => ({ usePerms: () => pageMock.perms }));
vi.mock("react-router-dom", () => ({ useNavigate: () => pageMock.navigate }));
vi.mock("../api/semiFinishedShortageAnalysis", () => ({
  semiFinishedShortageAnalysisApi: { list: pageMock.list, export: pageMock.exportFile },
}));
vi.mock("../utils/semiFinishedShortageAnalysis", async importOriginal => {
  const actual = await importOriginal<typeof import("../utils/semiFinishedShortageAnalysis")>();
  return { ...actual, downloadShortageExport: pageMock.download };
});
vi.mock("../utils/tableExport", () => ({ printTable: pageMock.print }));
vi.mock("@ant-design/icons", () => ({
  CloseOutlined: () => null,
  ExportOutlined: () => null,
  PrinterOutlined: () => null,
  SearchOutlined: () => null,
  SettingOutlined: () => null,
}));
vi.mock("antd", () => {
  const Button = ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => {
    const label = typeof children === "string" ? children : "";
    pageMock.buttons.push({ label, disabled, onClick });
    return createElement("button", { disabled, onClick }, children);
  };
  const Card = ({ title, extra, children }: { title?: ReactNode; extra?: ReactNode; children?: ReactNode }) =>
    createElement("section", null, title, extra, children);
  const Input = (props: { onChange?: (event: { target: { value: string } }) => void; value?: string }) => {
    pageMock.inputs.push(props);
    return createElement("input", null);
  };
  const Select = (props: { value?: string; onChange?: (value: string) => void; options?: { value: string; label: string }[] }) => {
    pageMock.selects.push(props);
    return createElement("select", null);
  };
  const Space = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const Table = (props: typeof pageMock.tableProps) => {
    pageMock.tableProps = props;
    return createElement("table", null);
  };
  const Tag = ({ children }: { children?: ReactNode }) => createElement("span", null, children);
  return { Button, Card, Input, Select, Space, Table, Tag, message: { error: pageMock.error } };
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
  addEventListener() { /* React event delegation surface. */ }
  removeEventListener() { /* React event delegation surface. */ }
  setAttribute() { /* React initial property surface. */ }
  removeAttribute() { /* React initial property surface. */ }
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
  history: { length: 2 },
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

const rows = [{
  customer: "ZURU",
  productCode: "9215A",
  productName: "孔雀MA",
  partCode: "AAA00030",
  assemblyName: "孔雀MA 外发",
  unit: "PCS",
  requiredQuantity: 12.5,
  inventoryQuantity: 2,
  shortageQuantity: 10.5,
}];

let root: Root | undefined;
let container: TestNode;

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function latestButton(label: string) {
  const button = [...pageMock.buttons].reverse().find(item => item.label === label);
  if (!button) throw new Error(`Missing Button: ${label}`);
  return button;
}

function latestFieldSelect() {
  const select = [...pageMock.selects].reverse().find(item => item.options?.some(option => option.value === "partCode"));
  if (!select) throw new Error("Missing shortage field Select");
  return select;
}

async function mount() {
  await act(async () => {
    root = createRoot(container as unknown as Element);
    root.render(createElement(SemiFinishedShortageAnalysisPage));
  });
  await settle();
}

beforeEach(() => {
  container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  pageMock.buttons = [];
  pageMock.download.mockReset();
  pageMock.error.mockReset();
  pageMock.exportFile.mockReset().mockResolvedValue(new Blob(["csv"]));
  pageMock.inputs = [];
  pageMock.list.mockReset().mockResolvedValue({ items: rows, total: 1, page: 1, pageSize: 50 });
  pageMock.navigate.mockReset();
  pageMock.perms = { "半成品欠料分析表": { 打开: true, 打印: true } };
  pageMock.print.mockReset();
  pageMock.selects = [];
  pageMock.tableProps = undefined;
  testWindow.history.length = 2;
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  testDocument.body.removeChild(container);
});

describe("半成品欠料分析表页面", () => {
  it("blocks users without open permission", async () => {
    pageMock.perms = { "半成品欠料分析表": { 打开: false, 打印: true } };
    await mount();
    expect(container.textContent).toContain("无权访问该页面");
    expect(pageMock.list).not.toHaveBeenCalled();
  });

  it("loads defaults and renders the nine report columns in order", async () => {
    await mount();
    expect(pageMock.list).toHaveBeenCalledWith({ field: "productCode", keyword: undefined, exact: false, page: 1, pageSize: 50 });
    expect(pageMock.tableProps?.columns.map(column => column.title)).toEqual([
      "客户", "产品货号", "产品名称", "配件编号", "产品装配名称", "单位", "需求数量", "库存数量", "欠料数量",
    ]);
    const shortageCell = pageMock.tableProps?.columns[8]?.render?.(10.5) as { props?: { children?: string } };
    expect(shortageCell.props?.children).toBe("10.5");
    expect(pageMock.tableProps?.locale?.emptyText).toBe("暂无欠料数据");
    expect(pageMock.tableProps?.rowKey?.(rows[0], 0)).toBeDefined();
    expect(pageMock.tableProps?.pagination?.total).toBe(1);
  });

  it("submits contains and exact filters, then keeps the active exact filter while paging", async () => {
    await mount();
    await act(async () => { latestFieldSelect().onChange?.("partCode"); });
    await act(async () => { pageMock.inputs.at(-1)?.onChange?.({ target: { value: " AAA " } }); });
    await act(async () => { latestButton("查询").onClick?.(); });
    await settle();
    expect(pageMock.list).toHaveBeenLastCalledWith({ field: "partCode", keyword: "AAA", exact: false, page: 1, pageSize: 50 });

    await act(async () => { latestButton("精确查询").onClick?.(); });
    await settle();
    expect(pageMock.list).toHaveBeenLastCalledWith({ field: "partCode", keyword: "AAA", exact: true, page: 1, pageSize: 50 });

    await act(async () => { pageMock.tableProps?.pagination?.onChange?.(3, 20); });
    await settle();
    expect(pageMock.list).toHaveBeenLastCalledWith({ field: "partCode", keyword: "AAA", exact: true, page: 3, pageSize: 20 });
  });

  it("allows returning from an empty page when records were removed", async () => {
    await mount();
    pageMock.list.mockResolvedValueOnce({ items: [], total: 60, page: 2, pageSize: 50 });

    await act(async () => { pageMock.tableProps?.pagination?.onChange?.(2, 50); });
    await settle();
    expect(pageMock.tableProps?.dataSource).toEqual([]);
    expect(pageMock.tableProps?.pagination).toMatchObject({ current: 2, total: 60 });

    pageMock.list.mockResolvedValueOnce({ items: rows, total: 60, page: 1, pageSize: 50 });
    await act(async () => { pageMock.tableProps?.pagination?.onChange?.(1, 50); });
    await settle();
    expect(pageMock.list).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 50 }));
  });

  it("uses print permission for export and print, and closes through router history", async () => {
    pageMock.perms = { "半成品欠料分析表": { 打开: true, 打印: false } };
    await mount();
    expect(latestButton("导出EXCEL").disabled).toBe(true);
    expect(latestButton("打印").disabled).toBe(true);

    act(() => root?.unmount());
    root = undefined;
    pageMock.perms = { "半成品欠料分析表": { 打开: true, 打印: true } };
    pageMock.buttons = [];
    pageMock.selects = [];
    pageMock.inputs = [];
    await mount();

    await act(async () => { latestButton("导出EXCEL").onClick?.(); });
    await settle();
    expect(pageMock.exportFile).toHaveBeenCalledWith({ field: "productCode", keyword: undefined, exact: false, page: 1, pageSize: 50 });
    expect(pageMock.download).toHaveBeenCalled();

    await act(async () => { latestButton("打印").onClick?.(); });
    expect(pageMock.print).toHaveBeenCalledWith("半成品欠料分析表", expect.any(Array), rows);

    await act(async () => { latestButton("关闭").onClick?.(); });
    expect(pageMock.navigate).toHaveBeenCalledWith(-1);
  });

  it("clears stale rows and blocks export and print while a new query is loading", async () => {
    await mount();
    expect(pageMock.tableProps?.dataSource).toEqual(rows);

    let resolveQuery!: (value: { items: typeof rows; total: number; page: number; pageSize: number }) => void;
    pageMock.list.mockImplementationOnce(() => new Promise(resolve => { resolveQuery = resolve; }));

    await act(async () => { latestButton("查询").onClick?.(); });

    expect(pageMock.tableProps?.dataSource).toEqual([]);
    expect(pageMock.tableProps?.pagination?.total).toBe(0);
    expect(latestButton("导出EXCEL").disabled).toBe(true);
    expect(latestButton("打印").disabled).toBe(true);

    await act(async () => { latestButton("导出EXCEL").onClick?.(); });
    await act(async () => { latestButton("打印").onClick?.(); });
    expect(pageMock.exportFile).not.toHaveBeenCalled();
    expect(pageMock.print).not.toHaveBeenCalled();

    await act(async () => { resolveQuery({ items: rows, total: 1, page: 1, pageSize: 50 }); });
    await settle();
    expect(latestButton("导出EXCEL").disabled).toBe(false);
    expect(latestButton("打印").disabled).toBe(false);
  });

  it("disables export and blocks the export API after a zero-result query", async () => {
    await mount();
    pageMock.exportFile.mockClear();
    pageMock.list.mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 50 });

    await act(async () => { latestButton("查询").onClick?.(); });
    await settle();

    expect(pageMock.tableProps?.dataSource).toEqual([]);
    expect(pageMock.tableProps?.pagination?.total).toBe(0);
    expect(latestButton("导出EXCEL").disabled).toBe(true);

    await act(async () => { latestButton("导出EXCEL").onClick?.(); });
    await settle();
    expect(pageMock.exportFile).not.toHaveBeenCalled();
  });

  it("invalidates visible rows and synchronizes export criteria when draft filters change", async () => {
    await mount();

    await act(async () => { latestFieldSelect().onChange?.("partCode"); });
    await act(async () => { pageMock.inputs.at(-1)?.onChange?.({ target: { value: " AAA " } }); });

    expect(pageMock.tableProps?.dataSource).toEqual([]);
    expect(pageMock.tableProps?.pagination).toMatchObject({ current: 1, total: 0 });
    expect(latestButton("导出EXCEL").disabled).toBe(true);
    expect(latestButton("打印").disabled).toBe(true);

    await act(async () => { latestButton("导出EXCEL").onClick?.(); });
    await settle();
    expect(pageMock.exportFile).not.toHaveBeenCalled();

    await act(async () => { latestButton("打印").onClick?.(); });
    expect(pageMock.print).not.toHaveBeenCalled();

    await act(async () => { latestButton("精确查询").onClick?.(); });
    await settle();
    expect(pageMock.list).toHaveBeenLastCalledWith({
      field: "partCode",
      keyword: "AAA",
      exact: true,
      page: 1,
      pageSize: 50,
    });
  });

  it("uses all row values and the table index to keep row keys unique", async () => {
    await mount();
    const rowKey = pageMock.tableProps?.rowKey;
    if (!rowKey) throw new Error("Missing rowKey");

    const differentGroupingRow = {
      ...rows[0],
      productName: "孔雀MA 新版",
      assemblyName: "孔雀MA 新版 外发",
      unit: "BOX",
      shortageQuantity: 9.5,
    };

    expect(rowKey(rows[0], 0)).not.toBe(rowKey(differentGroupingRow, 1));
    expect(rowKey(rows[0], 0)).not.toBe(rowKey({ ...rows[0] }, 1));
  });

  it("keeps the newest response when an older request finishes later", async () => {
    let resolveOlder!: (value: { items: typeof rows; total: number; page: number; pageSize: number }) => void;
    let resolveNewer!: (value: { items: typeof rows; total: number; page: number; pageSize: number }) => void;
    const older = new Promise<typeof pageMock.tableProps>(resolve => {
      resolveOlder = resolve as unknown as typeof resolveOlder;
    });
    const newer = new Promise<typeof pageMock.tableProps>(resolve => {
      resolveNewer = resolve as unknown as typeof resolveNewer;
    });
    pageMock.list.mockReset()
      .mockReturnValueOnce(older)
      .mockReturnValueOnce(newer);

    await mount();
    await act(async () => { pageMock.inputs.at(-1)?.onChange?.({ target: { value: "NEW" } }); });
    await act(async () => { latestButton("查询").onClick?.(); });

    const newestRows = [{ ...rows[0], productCode: "NEW" }];
    await act(async () => { resolveNewer({ items: newestRows, total: 1, page: 1, pageSize: 50 }); });
    await settle();
    expect(pageMock.tableProps?.dataSource).toEqual(newestRows);

    await act(async () => { resolveOlder({ items: rows, total: 1, page: 1, pageSize: 50 }); });
    await settle();
    expect(pageMock.tableProps?.dataSource).toEqual(newestRows);
  });
});
