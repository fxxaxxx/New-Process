import { act, cloneElement, createElement, useRef, useState, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BomSetupPage, { buildCloseTarget } from "../pages/styles/BomSetupPage";

const pageMock = vi.hoisted(() => ({
  inputNumbers: [] as Record<string, unknown>[],
  inputs: [] as Record<string, unknown>[],
  location: "/assembly-material-setup",
  masterList: vi.fn(),
  materials: vi.fn(),
  navigate: vi.fn(),
  apiPost: vi.fn(),
  partnerList: vi.fn(),
  perms: {} as Record<string, Record<string, boolean>>,
  saveMaterials: vi.fn(),
  search: "款号=STYLE-1",
  tables: [] as { dataSource: Record<string, unknown>[]; columns: Record<string, unknown>[]; onRow?: (row: Record<string, unknown>) => { onClick?: () => void } }[],
  buttons: [] as { label: string; disabled?: boolean; onClick?: () => void }[],
}));

vi.mock("../auth/PermissionContext", () => ({
  usePerms: () => pageMock.perms,
}));

vi.mock("../api/styles", () => ({
  stylesApi: {
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    materials: pageMock.materials,
    saveMaterials: pageMock.saveMaterials,
  },
}));

vi.mock("../api/master", () => ({
  masterApi: () => ({ list: pageMock.masterList }),
}));

vi.mock("../api/client", () => ({ api: { post: pageMock.apiPost } }));

vi.mock("react-router-dom", () => ({
  useLocation: () => ({ pathname: pageMock.location }),
  useNavigate: () => pageMock.navigate,
  useSearchParams: () => [new URLSearchParams(pageMock.search)],
}));

vi.mock("@ant-design/icons", () => ({
  CheckOutlined: () => null,
  CloseOutlined: () => null,
  DeleteOutlined: () => null,
  FileAddOutlined: () => null,
  FolderOpenOutlined: () => null,
  PlusOutlined: () => null,
  PrinterOutlined: () => null,
  SaveOutlined: () => null,
}));

let activeForm: {
  values: Record<string, unknown>;
  setFieldsValue: (values: Record<string, unknown>) => void;
  resetFields: () => void;
  getFieldsValue: () => Record<string, unknown>;
  getFieldValue: (name: string) => unknown;
  validateFields: () => Promise<Record<string, unknown>>;
} | undefined;

let activeOnValuesChange: ((changed: Record<string, unknown>) => void) | undefined;

vi.mock("antd", () => {
  const Button = ({ children, disabled, onClick }: { children?: ReactNode; disabled?: boolean; onClick?: () => void }) => {
    pageMock.buttons.push({ label: String(children ?? ""), disabled, onClick });
    return createElement("button", { disabled, onClick }, children);
  };
  const Input = (props: Record<string, unknown>) => {
    pageMock.inputs.push(props);
    return createElement("input", { value: props.value == null ? "" : String(props.value), disabled: props.disabled, onChange: props.onChange });
  };
  Input.Search = Input;
  const InputNumber = (props: Record<string, unknown>) => {
    pageMock.inputNumbers.push(props);
    return createElement("input", { value: props.value == null ? "" : String(props.value), disabled: props.disabled, onChange: props.onChange });
  };
  const DatePicker = (props: Record<string, unknown>) => createElement("input", { value: String(props.value ?? ""), disabled: props.disabled });
  const Checkbox = (props: Record<string, unknown>) => createElement("input", { type: "checkbox", checked: props.checked, disabled: props.disabled });
  const Select = (props: Record<string, unknown>) => createElement("span", { "data-select-disabled": props.disabled });
  const Card = ({ children, extra }: { children?: ReactNode; extra?: ReactNode }) => createElement("main", null, extra, children);
  const Col = ({ children }: { children?: ReactNode }) => createElement("section", null, children);
  const Row = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const Space = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const Result = ({ title, subTitle }: { title?: ReactNode; subTitle?: ReactNode }) => createElement("main", null, title, subTitle);
  const Popconfirm = ({ children }: { children?: ReactNode }) => createElement("span", null, children);
  const Modal = ({ open, children }: { open?: boolean; children?: ReactNode }) => open ? createElement("aside", null, children) : null;
  const Tabs = ({ items }: { items?: { children?: ReactNode }[] }) => createElement("div", null, items?.map((item, i) => createElement("section", { key: i }, item.children)));
  const Table = (props: { dataSource?: Record<string, unknown>[]; columns?: Record<string, unknown>[]; onRow?: (row: Record<string, unknown>) => { onClick?: () => void } }) => {
    const dataSource = props.dataSource ?? [];
    const columns = props.columns ?? [];
    pageMock.tables.push({ dataSource, columns, onRow: props.onRow });
    return createElement("table", null, dataSource.map((row, rowIndex) => createElement("tr", { key: rowIndex }, columns.map((column, columnIndex) => {
      const render = column.render as ((value: unknown, row: Record<string, unknown>, index: number) => ReactNode) | undefined;
      return createElement("td", { key: columnIndex }, render ? render(row[column.dataIndex as string], row, rowIndex) : String(row[column.dataIndex as string] ?? ""));
    }))));
  };
  const Form = Object.assign(
    ({ children, onValuesChange }: { children?: ReactNode; onValuesChange?: (changed: Record<string, unknown>) => void }) => {
      activeOnValuesChange = onValuesChange;
      return createElement("form", null, children);
    },
    {
      useForm: () => {
        const [, rerender] = useState(0);
        const valuesRef = useRef<Record<string, unknown>>({});
        const formRef = useRef<typeof activeForm>(undefined);
        if (!formRef.current) {
          const values = valuesRef.current;
          formRef.current = {
            values,
            setFieldsValue: (next: Record<string, unknown>) => { Object.assign(values, next); rerender(v => v + 1); },
            resetFields: () => { for (const key of Object.keys(values)) delete values[key]; rerender(v => v + 1); },
            getFieldsValue: () => ({ ...values }),
            getFieldValue: (name: string) => values[name],
            validateFields: async () => ({ ...values }),
          };
        }
        activeForm = formRef.current;
        return [formRef.current];
      },
      Item: ({ name, label, children }: { name?: string; label?: ReactNode; children?: ReactNode }) => {
        const child = children as ReactElement<Record<string, unknown>>;
        const value = name ? activeForm?.values[name] : undefined;
        const props = !name
          ? { "aria-label": label }
          : child?.props && Object.prototype.hasOwnProperty.call(child.props, "checked")
            ? { "aria-label": label, checked: value }
            : { "aria-label": label, value };
        const childProps = child && name
          ? {
              ...props,
              onChange: (event: { target?: { value?: unknown; checked?: unknown } }) => {
                const value = event.target?.checked ?? event.target?.value;
                if (activeForm) activeForm.values[name] = value;
                activeOnValuesChange?.({ [name]: value });
              },
            }
          : props;
        return createElement("label", null, label, child ? cloneElement(child, childProps) : null);
      },
    },
  );
  return { Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Result, Row, Select, Space, Table, Tabs, Tag: ({ children }: { children?: ReactNode }) => createElement("span", null, children), message: { error: vi.fn(), success: vi.fn(), warning: vi.fn(), info: vi.fn() } };
});

class TestNode {
  nodeType = 1;
  nodeName: string;
  tagName: string;
  ownerDocument: TestDocument;
  parentNode: TestNode | null = null;
  childNodes: TestNode[] = [];
  style = { setProperty: () => undefined, removeProperty: () => undefined };
  constructor(nodeName: string, ownerDocument: TestDocument) { this.nodeName = nodeName.toUpperCase(); this.tagName = nodeName.toLowerCase(); this.ownerDocument = ownerDocument; }
  appendChild<T extends TestNode>(child: T): T { child.parentNode = this; this.childNodes.push(child); return child; }
  insertBefore<T extends TestNode>(child: T, before: TestNode | null): T { const index = before ? this.childNodes.indexOf(before) : -1; child.parentNode = this; index < 0 ? this.childNodes.push(child) : this.childNodes.splice(index, 0, child); return child; }
  removeChild<T extends TestNode>(child: T): T { const index = this.childNodes.indexOf(child); if (index >= 0) this.childNodes.splice(index, 1); child.parentNode = null; return child; }
  addEventListener() { /* React event delegation surface. */ }
  removeEventListener() { /* React event delegation surface. */ }
  setAttribute() { /* React initial properties surface. */ }
  removeAttribute() { /* React initial properties surface. */ }
  contains(node: TestNode | null): boolean { return node === this || this.childNodes.some(child => child.contains(node)); }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild(): TestNode | null { return this.childNodes.at(-1) ?? null; }
  get textContent() { return this.childNodes.map(child => child.textContent).join(""); }
  set textContent(_value: string | null) { this.childNodes = []; }
}

class TestDocument extends TestNode {
  nodeType = 9;
  documentElement: TestNode;
  body: TestNode;
  constructor() { super("#document", undefined as unknown as TestDocument); this.ownerDocument = this; this.documentElement = new TestNode("html", this); this.body = new TestNode("body", this); this.documentElement.appendChild(this.body); }
  createElement(name: string) { return new TestNode(name, this); }
  createElementNS(_namespace: string, name: string) { return new TestNode(name, this); }
  createTextNode(value: string) { const node = new TestNode("#text", this); node.textContent = value; return node; }
  createComment(value: string) { return this.createTextNode(value); }
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
  sessionStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), removeItem: (key: string) => storage.delete(key) },
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
};
testWindow.window = testWindow;
testWindow.self = testWindow;
Object.assign(globalThis, { document: testDocument, window: testWindow, HTMLElement: TestNode, HTMLIFrameElement: TestNode, Element: TestNode, SVGElement: TestNode, Node: TestNode, IS_REACT_ACT_ENVIRONMENT: true, localStorage: { getItem: () => "测试用户" } });

let root: Root | undefined;
let container: TestNode;

const material = { 客户编号: "C-1", 客户名称: "客户一", 日期: "2026-07-13", 物料编号: "MAT-1", 物料名称: "彩盒", 规格: "S", 颜色: "白", 单位: "盒", 使用数量: 1, 工模编号: "TM-1", 备注: "行注" };
const extension = { 产品装配名称: "产品一装配", 配件编号: "PART-1", 共用物料编号: "COMMON-1", 装配方式: "组装半成品", 类别: "半成品", 库存单价HK: 2.5, 其他成本HK: 0.3, 需求用量: 1, 单位: "盒", 半成品计算库存: true, 备注内容: "扩展备注", 调整审核: false };
const quote = { ID: 7, 物料编号: "MAT-1", 物料名称: "彩盒", 合作方类型: "供应商", 合作方编号: "SUP-1", 合作方名称: "原供应商", 报价日期: "2026-07-13", 货币: "RMB", 单价: 4.5, 港币价: 5.1, 对比相差: 0.2, 相差比例: 0.04, 是否默认: true, 顺序: 1, 备注: "保留元数据" };

function full(款号: string, extra: Record<string, unknown> = {}) {
  return { 款号, 款式: 款号 === "STYLE-2" ? "产品二" : "产品一", 物料: [material], 扩展: extension, 报价: [quote], ...extra };
}

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
}

async function mount() {
  await act(async () => { root = createRoot(container as unknown as Element); root.render(createElement(BomSetupPage)); });
  await settle();
}

function latestInput(label: string) {
  return [...pageMock.inputs].reverse().find(input => input["aria-label"] === label);
}

function latestButton(label: string) {
  const button = [...pageMock.buttons].reverse().find(item => item.label === label);
  if (!button) throw new Error(`Missing button ${label}; saw ${pageMock.buttons.map(item => item.label).join(",")}`);
  return button;
}

beforeEach(() => {
  container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  pageMock.inputNumbers = [];
  pageMock.inputs = [];
  pageMock.location = "/assembly-material-setup";
  pageMock.masterList.mockReset().mockResolvedValue({ items: [], total: 0 });
  pageMock.materials.mockReset().mockResolvedValue(full("STYLE-1"));
  pageMock.navigate.mockReset();
  pageMock.apiPost.mockReset().mockResolvedValue(undefined);
  pageMock.partnerList.mockReset().mockResolvedValue({ items: [{ 供应商编号: "SUP-2", 供应商名称: "新供应商", 货币: "HK$" }], total: 1 });
  pageMock.perms = { 款号资料: { 打开: true, 保存: true, 删除: true, 单价: true, 审核: true, 反审核: true } };
  pageMock.saveMaterials.mockReset().mockResolvedValue(undefined);
  pageMock.search = "款号=STYLE-1";
  pageMock.tables = [];
  pageMock.buttons = [];
  activeForm = undefined;
  activeOnValuesChange = undefined;
  storage.clear();
});

afterEach(() => {
  if (root) { act(() => root?.unmount()); root = undefined; }
  testDocument.body.removeChild(container);
});

describe("装配物料设置持久化行为", () => {
  it("masks protected extension and quote prices and disables their editors", async () => {
    pageMock.perms = { 款号资料: { 打开: true, 保存: true, 单价: false } };
    await mount();

    const priceInputs = new Map<string, Record<string, unknown>>();
    for (const input of [...pageMock.inputs, ...pageMock.inputNumbers]) {
      const field = input["data-price-field"];
      if (field) priceInputs.set(String(field), input);
    }
    expect([...priceInputs.values()]).toHaveLength(4);
    expect([...priceInputs.values()].every(input => input.disabled === true)).toBe(true);
    expect([...priceInputs.values()].every(input => input.value === "***")).toBe(true);
  });

  it("clears extension and quotes when the next compatible response omits both sections", async () => {
    pageMock.materials.mockReset().mockResolvedValueOnce(full("STYLE-1")).mockResolvedValueOnce(full("STYLE-2", { 扩展: undefined, 报价: undefined }));
    await mount();

    pageMock.search = "款号=STYLE-2";
    await act(async () => { root?.render(createElement(BomSetupPage)); });
    await settle();

    expect(latestInput("产品装配名称")?.value).toBeUndefined();
    const quoteTable = [...pageMock.tables].reverse().find(table => table.columns.some(column => column.dataIndex === "单价"));
    expect(quoteTable?.dataSource).toEqual([]);
  });

  it("omits new sections from a legacy BOM save even when the response contains them", async () => {
    pageMock.location = "/bom-setup";
    await mount();

    await act(async () => { latestButton("保存").onClick?.(); });
    await settle();

    const body = pageMock.saveMaterials.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).not.toHaveProperty("扩展");
    expect(body).not.toHaveProperty("报价");
    expect(body).toHaveProperty("明细");
  });

  it("activates the extension only after an assembly user edit when sections were absent", async () => {
    pageMock.materials.mockReset().mockResolvedValue(full("STYLE-1", { 扩展: null, 报价: null }));
    await mount();

    const extensionName = latestInput("产品装配名称");
    await act(async () => { (extensionName?.onChange as ((event: unknown) => void) | undefined)?.({ target: { value: "新装配名称" } }); });
    await act(async () => { latestButton("保存").onClick?.(); });
    await settle();

    const body = pageMock.saveMaterials.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body).toHaveProperty("扩展");
    expect(body).not.toHaveProperty("报价");
  });

  it("hydrates and saves persisted extension and quote sections", async () => {
    await mount();

    await act(async () => {
      (latestInput("产品装配名称")?.onChange as ((event: unknown) => void) | undefined)?.({ target: { value: "产品一装配新版" } });
      latestButton("保存").onClick?.();
    });
    await settle();

    const body = pageMock.saveMaterials.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(body.扩展).toMatchObject({ 产品装配名称: "产品一装配新版" });
    expect(body.报价).toMatchObject([{ ID: 7, 合作方名称: "原供应商", 备注: "保留元数据" }]);
  });

  it("keeps audited assembly details read-only and exposes reverse audit", async () => {
    pageMock.materials.mockReset().mockResolvedValue(full("STYLE-1", {
      扩展: { ...extension, 调整审核: true, 审核人: "auditor" },
    }));
    await mount();

    expect(latestButton("保存").disabled).toBe(true);
    expect(latestInput("产品装配名称")?.disabled).toBe(true);
    expect(latestButton("反审核").disabled).not.toBe(true);
  });

  it("calls the assembly audit endpoint from the assembly route", async () => {
    await mount();

    await act(async () => { latestButton("审核").onClick?.(); });
    await settle();

    expect(pageMock.apiPost).toHaveBeenCalledWith("/styles/STYLE-1/audit");
  });

  it("uses the supplied return route when closing", () => {
    expect(buildCloseTarget("/semi-finished-common-materials")).toBe("/semi-finished-common-materials");
    expect(buildCloseTarget(null)).toBe(-1);
  });

  it("does not expose or call assembly audit from the legacy BOM route", async () => {
    pageMock.location = "/bom-setup";
    await mount();

    expect(pageMock.buttons.some(button => button.label === "审核")).toBe(false);
    expect(pageMock.buttons.some(button => button.label === "反审核")).toBe(false);
    expect(pageMock.apiPost).not.toHaveBeenCalled();
  });

  it("replaces an existing quote partner while preserving the quote metadata", async () => {
    await mount();

    const partnerSearch = pageMock.inputs.find(input => input["data-role"] === "quote-partner");
    expect(partnerSearch).toBeDefined();
    await act(async () => { (partnerSearch?.onSearch as (() => void) | undefined)?.(); });
    await settle();
    const partnerTable = [...pageMock.tables].reverse().find(table => table.onRow);
    partnerTable?.onRow?.({ 供应商编号: "SUP-2", 供应商名称: "新供应商", 货币: "HK$" })?.onClick?.();
    await settle();

    const quoteTable = [...pageMock.tables].reverse().find(table => table.columns.some(column => column.dataIndex === "单价"));
    expect(quoteTable?.dataSource).toHaveLength(1);
    expect(quoteTable?.dataSource[0]).toMatchObject({ ID: 7, 名称: "新供应商", 编号: "SUP-2", 备注: "保留元数据" });
  });

  it("ignores a stale document response when a newer load completes first", async () => {
    let resolveFirst!: (value: unknown) => void;
    let resolveSecond!: (value: unknown) => void;
    pageMock.materials.mockReset().mockImplementation((key: string) => new Promise(resolve => {
      if (key === "STYLE-1") resolveFirst = resolve;
      else resolveSecond = resolve;
    }));
    await mount();

    pageMock.search = "款号=STYLE-2";
    await act(async () => { root?.render(createElement(BomSetupPage)); });
    resolveSecond(full("STYLE-2"));
    await settle();
    resolveFirst(full("STYLE-1"));
    await settle();

    expect(latestInput("产品名称")?.value).toBe("产品二");
  });
});
