import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SemiFinishedLabelProductPicker from "../pages/semi/SemiFinishedLabelProductPicker";
import SemiFinishedLabelOrderPicker from "../pages/semi/SemiFinishedLabelOrderPicker";

type ButtonProps = { children?: ReactNode; disabled?: boolean; onClick?: () => void };
type InputProps = { value?: string; onChange?: (event: { target: { value: string } }) => void; onSearch?: () => void };
type TableProps = {
  columns?: { title?: ReactNode; dataIndex?: string }[];
  dataSource?: Record<string, unknown>[];
  scroll?: { x?: number | string; y?: number | string };
  rowSelection?: {
    selectedRowKeys?: (string | number)[];
    onChange?: (keys: (string | number)[], rows: Record<string, unknown>[]) => void;
    preserveSelectedRowKeys?: boolean;
  };
  onRow?: (row: Record<string, unknown>) => { onClick?: () => void; onDoubleClick?: () => void };
  pagination?: { onChange?: (page: number) => void };
};

const pickerMock = vi.hoisted(() => ({
  buttons: [] as ButtonProps[],
  inputs: [] as InputProps[],
  tables: [] as TableProps[],
  products: vi.fn(),
  list: vi.fn(),
  errors: vi.fn(),
}));

vi.mock("../auth/PermissionContext", () => ({
  usePerms: () => ({ 半成品标签单: { 打开: true, 单价: true } }),
}));

vi.mock("../api/semiFinishedLabelOrders", () => ({
  semiFinishedLabelOrdersApi: { products: pickerMock.products, list: pickerMock.list },
}));

vi.mock("@ant-design/icons", () => ({
  CheckOutlined: () => null,
  CloseOutlined: () => null,
  SearchOutlined: () => null,
}));

vi.mock("antd", () => {
  const Button = (props: ButtonProps) => {
    pickerMock.buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  };
  const Input = (props: InputProps) => {
    pickerMock.inputs.push(props);
    return createElement("input", null);
  };
  Input.Search = Input;
  const Modal = ({ children, footer }: { children?: ReactNode; footer?: ReactNode }) => createElement("section", null, children, footer);
  const Select = () => createElement("select", null);
  const Space = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const Table = (props: TableProps) => {
    pickerMock.tables.push(props);
    return createElement("table", null);
  };
  const Tag = ({ children }: { children?: ReactNode }) => createElement("span", null, children);
  return { Button, Input, Modal, Select, Space, Table, Tag, message: { error: pickerMock.errors } };
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

  constructor(name: string, ownerDocument: TestDocument) {
    this.nodeName = name.toUpperCase();
    this.tagName = name.toLowerCase();
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
  addEventListener() { /* React event surface. */ }
  removeEventListener() { /* React event surface. */ }
  setAttribute() { /* React element surface. */ }
  removeAttribute() { /* React element surface. */ }
  contains(node: TestNode | null): boolean { return node === this || this.childNodes.some(child => child.contains(node)); }
  get firstChild() { return this.childNodes[0] ?? null; }
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function latestButton(label: string) {
  const button = [...pickerMock.buttons].reverse().find(item => String(item.children ?? "") === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  return button;
}

function latestInput() {
  const input = pickerMock.inputs.at(-1);
  if (!input) throw new Error("Missing input");
  return input;
}

function latestTable(column: string) {
  const table = [...pickerMock.tables].reverse().find(item => item.columns?.some(col => col.dataIndex === column));
  if (!table) throw new Error(`Missing table: ${column}`);
  return table;
}

async function mount(component: ReactNode) {
  await act(async () => {
    root = createRoot(container as unknown as Element);
    root.render(component);
  });
  await settle();
}

beforeEach(() => {
  container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  pickerMock.buttons = [];
  pickerMock.inputs = [];
  pickerMock.tables = [];
  pickerMock.products.mockReset().mockResolvedValue({ items: [], total: 0 });
  pickerMock.list.mockReset().mockResolvedValue({ items: [], total: 0 });
  pickerMock.errors.mockReset();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  testDocument.body.removeChild(container);
});

describe("半成品标签单选择器真实行为", () => {
  it("keeps an exact product result when an older contains query resolves later and does not query on input", async () => {
    await mount(createElement(SemiFinishedLabelProductPicker, { open: true, onPick: vi.fn(), onClose: vi.fn() }));
    const callsAfterOpen = pickerMock.products.mock.calls.length;

    await act(async () => { latestInput().onChange?.({ target: { value: "ACC" } }); });
    expect(pickerMock.products).toHaveBeenCalledTimes(callsAfterOpen);

    const oldQuery = deferred<{ items: Record<string, unknown>[]; total: number }>();
    const exactQuery = deferred<{ items: Record<string, unknown>[]; total: number }>();
    pickerMock.products.mockImplementationOnce(() => oldQuery.promise).mockImplementationOnce(() => exactQuery.promise);
    await act(async () => { latestButton("查询").onClick?.(); });
    await act(async () => { latestButton("精确查询").onClick?.(); });

    await act(async () => { exactQuery.resolve({ items: [{ 配件编号: "NEW", 产品货号: "P2" }], total: 1 }); await exactQuery.promise; });
    expect(latestTable("配件编号").dataSource?.[0]?.配件编号).toBe("NEW");
    await act(async () => { oldQuery.resolve({ items: [{ 配件编号: "OLD", 产品货号: "P1" }], total: 1 }); await oldQuery.promise; });
    expect(latestTable("配件编号").dataSource?.[0]?.配件编号).toBe("NEW");
    expect(pickerMock.products.mock.calls.at(-1)?.[0]).toMatchObject({ keyword: "ACC", exact: true });
  });

  it("preserves product keyword and selection when a query fails", async () => {
    const row = { 配件编号: "ACC-1", 产品货号: "P-1" };
    pickerMock.products.mockResolvedValueOnce({ items: [row], total: 1 });
    await mount(createElement(SemiFinishedLabelProductPicker, { open: true, onPick: vi.fn(), onClose: vi.fn() }));
    await settle();

    await act(async () => { latestTable("配件编号").rowSelection?.onChange?.(["ACC-1-P-1"], [row]); });
    await act(async () => { latestInput().onChange?.({ target: { value: "keep-me" } }); });
    pickerMock.products.mockRejectedValueOnce(new Error("network"));
    await act(async () => { latestButton("查询").onClick?.(); });
    await settle();

    expect(latestInput().value).toBe("keep-me");
    expect(latestTable("配件编号").rowSelection?.selectedRowKeys).toEqual(["ACC-1-P-1"]);
    expect(latestButton("选择").disabled).toBe(false);
  });

  it("retains selected product snapshots across result pages", async () => {
    const first = { ID: 1, 配件编号: "ACC-1", 产品货号: "P-1" };
    const second = { ID: 2, 配件编号: "ACC-2", 产品货号: "P-2" };
    const onPick = vi.fn();
    pickerMock.products.mockResolvedValueOnce({ items: [first], total: 2 });
    await mount(createElement(SemiFinishedLabelProductPicker, { open: true, onPick, onClose: vi.fn() }));

    await act(async () => { latestTable("配件编号").rowSelection?.onChange?.([1], [first]); });
    pickerMock.products.mockResolvedValueOnce({ items: [second], total: 2 });
    await act(async () => { latestTable("配件编号").pagination?.onChange?.(2); });
    await settle();
    await act(async () => { latestTable("配件编号").rowSelection?.onChange?.([1, 2], [second]); });
    await act(async () => { latestButton("选择").onClick?.(); });

    expect(latestTable("配件编号").rowSelection?.preserveSelectedRowKeys).toBe(true);
    expect(onPick).toHaveBeenCalledWith([first, second]);
  });

  it("isolates historical-order responses, preserves failed-query state, and exposes only real columns", async () => {
    const initial = { 电脑单号: "SBL-1", 日期: "2026-07-14", 操作员: "tester", 审核: "0" };
    pickerMock.list.mockResolvedValueOnce({ items: [initial], total: 1 });
    await mount(createElement(SemiFinishedLabelOrderPicker, { open: true, onPick: vi.fn(), onClose: vi.fn() }));
    await settle();
    await act(async () => { latestTable("电脑单号").onRow?.(initial).onClick?.(); });

    const callsAfterOpen = pickerMock.list.mock.calls.length;
    await act(async () => { latestInput().onChange?.({ target: { value: "older" } }); });
    expect(pickerMock.list).toHaveBeenCalledTimes(callsAfterOpen);

    const oldQuery = deferred<{ items: Record<string, unknown>[]; total: number }>();
    const newQuery = deferred<{ items: Record<string, unknown>[]; total: number }>();
    pickerMock.list.mockImplementationOnce(() => oldQuery.promise).mockImplementationOnce(() => newQuery.promise);
    await act(async () => { latestInput().onSearch?.(); });
    await act(async () => { latestInput().onChange?.({ target: { value: "newer" } }); });
    await act(async () => { latestInput().onSearch?.(); });
    await act(async () => { newQuery.resolve({ items: [{ 电脑单号: "NEW" }], total: 1 }); await newQuery.promise; });
    await act(async () => { oldQuery.resolve({ items: [{ 电脑单号: "OLD" }], total: 1 }); await oldQuery.promise; });
    expect(latestTable("电脑单号").dataSource?.[0]?.电脑单号).toBe("NEW");

    pickerMock.list.mockRejectedValueOnce(new Error("network"));
    await act(async () => { latestInput().onChange?.({ target: { value: "still-here" } }); });
    await act(async () => { latestInput().onSearch?.(); });
    await settle();
    expect(latestInput().value).toBe("still-here");
    expect(latestButton("打开").disabled).toBe(false);

    const table = latestTable("电脑单号");
    expect(table.columns?.map(column => column.dataIndex)).not.toContain("明细行数");
    expect(table.scroll?.x).toBeTruthy();
  });
});
