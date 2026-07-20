import { act, createElement, type ReactElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import dayjs from "dayjs";
import SemiFinishedLabelOrderPage from "../pages/semi/SemiFinishedLabelOrderPage";
import appSource from "../App.tsx?raw";
import menuSource from "../nav/menuTree.tsx?raw";
import pageSource from "../pages/semi/SemiFinishedLabelOrderPage.tsx?raw";

type ButtonProps = { children?: ReactNode; disabled?: boolean; loading?: boolean; onClick?: () => void };
type ColumnProps = {
  title?: ReactNode;
  dataIndex?: string;
  render?: (value: unknown, row: Record<string, unknown>) => ReactNode;
};
type TableProps = {
  columns?: ColumnProps[];
  dataSource?: Record<string, unknown>[];
  rowClassName?: (record: Record<string, unknown>, index: number) => string;
};
type OrderPickerProps = { open: boolean; onPick: (orderNo: string) => void; onClose: () => void };
type ProductPickerProps = { open: boolean; onPick: (rows: Record<string, unknown>[]) => void; onClose: () => void };
type PrintPreviewProps = { open: boolean; documentDate?: string; onClose: () => void };
type FormItemRecord = {
  label?: ReactNode;
  child?: ReactElement<{ disabled?: boolean; children?: ReactNode }>;
};
type PopconfirmProps = { children?: ReactNode; disabled?: boolean; onConfirm?: () => void };

const pageMock = vi.hoisted(() => ({
  buttons: [] as ButtonProps[],
  tables: [] as TableProps[],
  orderPicker: undefined as OrderPickerProps | undefined,
  productPicker: undefined as ProductPickerProps | undefined,
  printPreview: undefined as PrintPreviewProps | undefined,
  formItems: [] as FormItemRecord[],
  popconfirms: [] as PopconfirmProps[],
  formOnValuesChange: undefined as (() => void) | undefined,
  formValues: {} as Record<string, unknown>,
  perms: {} as Record<string, Record<string, boolean>>,
  get: vi.fn(),
  adjacent: vi.fn(),
  audit: vi.fn(),
  reverseAudit: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  errors: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("../auth/PermissionContext", () => ({
  usePerms: () => pageMock.perms,
}));

vi.mock("../api/semiFinishedLabelOrders", () => ({
  semiFinishedLabelOrdersApi: {
    get: pageMock.get,
    adjacent: pageMock.adjacent,
    audit: pageMock.audit,
    reverseAudit: pageMock.reverseAudit,
    create: pageMock.create,
    update: pageMock.update,
    remove: pageMock.remove,
  },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => pageMock.navigate };
});

vi.mock("../pages/semi/SemiFinishedLabelProductPicker", () => ({
  default: (props: ProductPickerProps) => { pageMock.productPicker = props; return null; },
}));
vi.mock("../pages/semi/SemiFinishedLabelOrderPicker", () => ({
  default: (props: OrderPickerProps) => { pageMock.orderPicker = props; return null; },
}));
vi.mock("../pages/semi/SemiFinishedLabelPrintPreview", () => ({
  default: (props: PrintPreviewProps) => { pageMock.printPreview = props; return null; },
}));

vi.mock("@ant-design/icons", () => ({
  CheckOutlined: () => null,
  CloseOutlined: () => null,
  CopyOutlined: () => null,
  DeleteOutlined: () => null,
  FileAddOutlined: () => null,
  FolderOpenOutlined: () => null,
  LeftOutlined: () => null,
  PrinterOutlined: () => null,
  RightOutlined: () => null,
  SaveOutlined: () => null,
  TableOutlined: () => null,
  UndoOutlined: () => null,
}));

vi.mock("antd", () => {
  const passthrough = ({ children }: { children?: ReactNode }) => createElement("div", null, children);
  const Card = ({ children, extra }: { children?: ReactNode; extra?: ReactNode }) => createElement("main", null, extra, children);
  const Button = (props: ButtonProps) => {
    pageMock.buttons.push(props);
    return createElement("button", { onClick: props.onClick }, props.children);
  };
  const FormRoot = ({ children, onValuesChange }: { children?: ReactNode; onValuesChange?: () => void }) => {
    pageMock.formOnValuesChange = onValuesChange;
    return createElement("div", null, children);
  };
  const FormItem = ({ children, label }: { children?: ReactNode; label?: ReactNode }) => {
    pageMock.formItems.push({ label, child: children as ReactElement<{ disabled?: boolean }> });
    return createElement("div", null, children);
  };
  const Form = Object.assign(FormRoot, {
    useForm: () => [{
      resetFields: () => { pageMock.formValues = {}; },
      setFieldsValue: (values: Record<string, unknown>) => { pageMock.formValues = { ...pageMock.formValues, ...values }; },
      setFieldValue: (key: string, value: unknown) => { pageMock.formValues[key] = value; },
      getFieldValue: (key: string) => pageMock.formValues[key],
      validateFields: async () => pageMock.formValues,
    }],
    Item: FormItem,
  });
  const Input = (props: Record<string, unknown>) => createElement("input", props);
  const InputNumber = (props: Record<string, unknown>) => createElement("input", props);
  const Table = (props: TableProps) => { pageMock.tables.push(props); return createElement("table", null); };
  const Popconfirm = (props: PopconfirmProps) => {
    pageMock.popconfirms.push(props);
    return createElement("div", null, props.children);
  };
  const Tag = ({ children }: { children?: ReactNode }) => createElement("span", null, children);
  return {
    Button,
    Card,
    Col: passthrough,
    DatePicker: () => createElement("input", null),
    Form,
    Input,
    InputNumber,
    Popconfirm,
    Row: passthrough,
    Space: passthrough,
    Statistic: () => null,
    Table,
    Tag,
    message: { error: pageMock.errors, info: vi.fn(), success: vi.fn() },
  };
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
const storage = new Map<string, string>([["erp_user", "tester"]]);
const testWindow = {
  document: testDocument,
  window: undefined as unknown,
  self: undefined as unknown,
  history: { length: 2 },
  localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  },
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
  localStorage: testWindow.localStorage,
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

const order = (电脑单号: string, 审核 = "0") => ({
  ID: 1,
  电脑单号,
  日期: "2026-07-14",
  备注一: `${电脑单号}-note`,
  操作员: "tester",
  审核,
  明细: [{
    配件编号: `${电脑单号}-part`,
    产品货号: `${电脑单号}-product`,
    数量: 10,
    每箱数量: 5,
    预计标签数: 2,
    实需标签数: 2,
    实需标签数已手改: false,
  }],
});

async function settle() {
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
}

function latestButton(label: string) {
  const button = [...pageMock.buttons].reverse().find(item => String(item.children ?? "") === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  return button;
}

function latestTable() {
  const table = pageMock.tables.at(-1);
  if (!table) throw new Error("Missing line table");
  return table;
}

function latestFormItem(label: string) {
  const item = [...pageMock.formItems].reverse().find(record => record.label === label);
  if (!item) throw new Error(`Missing form item: ${label}`);
  return item;
}

function latestDeleteConfirm() {
  const confirm = pageMock.popconfirms.at(-1);
  if (!confirm) throw new Error("Missing delete confirmation");
  return confirm;
}

async function mountPage() {
  await act(async () => {
    root = createRoot(container as unknown as Element);
    root.render(createElement(SemiFinishedLabelOrderPage));
  });
  await settle();
}

async function remountPage() {
  if (root) {
    await act(async () => root?.unmount());
    root = undefined;
  }
  pageMock.buttons = [];
  pageMock.tables = [];
  pageMock.formItems = [];
  pageMock.popconfirms = [];
  await mountPage();
}

async function pickOrder(orderNo: string) {
  await act(async () => { latestButton("打开").onClick?.(); });
  if (!pageMock.orderPicker) throw new Error("Missing order picker");
  await act(async () => { pageMock.orderPicker?.onPick(orderNo); });
}

beforeEach(async () => {
  container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  pageMock.buttons = [];
  pageMock.tables = [];
  pageMock.orderPicker = undefined;
  pageMock.productPicker = undefined;
  pageMock.printPreview = undefined;
  pageMock.formItems = [];
  pageMock.popconfirms = [];
  pageMock.formOnValuesChange = undefined;
  pageMock.formValues = {};
  pageMock.perms = { 半成品标签单: { 打开: true, 保存: true, 删除: true, 审核: true, 反审核: true, 打印: true } };
  pageMock.get.mockReset();
  pageMock.adjacent.mockReset();
  pageMock.audit.mockReset().mockResolvedValue({});
  pageMock.reverseAudit.mockReset().mockResolvedValue({});
  pageMock.create.mockReset();
  pageMock.update.mockReset();
  pageMock.remove.mockReset();
  pageMock.errors.mockReset();
  pageMock.navigate.mockReset();
  await mountPage();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  testDocument.body.removeChild(container);
});

describe("半成品标签单页面真实行为", () => {
  it("does not let an older open response replace the newest order and preserves state on failure", async () => {
    const oldRequest = deferred<ReturnType<typeof order>>();
    const newRequest = deferred<ReturnType<typeof order>>();
    pageMock.get.mockImplementationOnce(() => oldRequest.promise).mockImplementationOnce(() => newRequest.promise);
    await pickOrder("OLD");
    await pickOrder("NEW");

    await act(async () => { newRequest.resolve(order("NEW")); await newRequest.promise; });
    await act(async () => { oldRequest.resolve(order("OLD")); await oldRequest.promise; });
    expect(pageMock.formValues.电脑单号).toBe("NEW");
    expect(latestTable().dataSource?.[0]?.配件编号).toBe("NEW-part");

    pageMock.get.mockRejectedValueOnce(new Error("network"));
    await pickOrder("FAIL");
    await settle();
    expect(pageMock.formValues.电脑单号).toBe("NEW");
    expect(latestTable().dataSource?.[0]?.配件编号).toBe("NEW-part");
  });

  it("does not let an older adjacent response replace a newer adjacent order", async () => {
    pageMock.get.mockResolvedValueOnce(order("BASE"));
    await pickOrder("BASE");
    await settle();

    const oldRequest = deferred<ReturnType<typeof order>>();
    const newRequest = deferred<ReturnType<typeof order>>();
    pageMock.adjacent.mockImplementationOnce(() => oldRequest.promise).mockImplementationOnce(() => newRequest.promise);
    await act(async () => { latestButton("后单").onClick?.(); });
    await act(async () => { latestButton("后单").onClick?.(); });
    await act(async () => { newRequest.resolve(order("NEXT-2")); await newRequest.promise; });
    await act(async () => { oldRequest.resolve(order("NEXT-1")); await oldRequest.promise; });

    expect(pageMock.formValues.电脑单号).toBe("NEXT-2");
  });

  it("does not let a stale audit reload replace a newer open", async () => {
    pageMock.get.mockResolvedValueOnce(order("BASE"));
    await pickOrder("BASE");
    await settle();

    const auditRequest = deferred<Record<string, never>>();
    const newerOpen = deferred<ReturnType<typeof order>>();
    const staleReload = deferred<ReturnType<typeof order>>();
    pageMock.audit.mockImplementationOnce(() => auditRequest.promise);
    pageMock.get.mockImplementationOnce(() => newerOpen.promise).mockImplementationOnce(() => staleReload.promise);
    await act(async () => { latestButton("审核").onClick?.(); });
    await pickOrder("NEWER");
    await act(async () => { newerOpen.resolve(order("NEWER")); await newerOpen.promise; });
    await act(async () => { auditRequest.resolve({}); await auditRequest.promise; });
    await settle();
    staleReload.resolve(order("BASE", "1"));
    await settle();

    expect(pageMock.formValues.电脑单号).toBe("NEWER");
  });

  it("renders audited orders as read-only", async () => {
    pageMock.get.mockResolvedValueOnce(order("AUDITED", "1"));
    await pickOrder("AUDITED");
    await settle();

    expect(latestButton("保存").disabled).toBe(true);
    const quantity = latestTable().columns?.find(column => column.title === "数量");
    const rendered = quantity?.render?.(10, latestTable().dataSource?.[0] ?? {}) as ReactElement<{ disabled?: boolean }>;
    expect(rendered.props.disabled).toBe(true);
  });

  it("applies an update response while edit controls are locked", async () => {
    pageMock.get.mockResolvedValueOnce(order("BASE"));
    await pickOrder("BASE");
    await settle();
    const updateRequest = deferred<ReturnType<typeof order>>();
    pageMock.update.mockImplementationOnce(() => updateRequest.promise);
    await act(async () => { latestButton("保存").onClick?.(); });

    expect(pageMock.formOnValuesChange).toBeTypeOf("function");
    pageMock.formValues.备注一 = "edited-after-save";
    await act(async () => { pageMock.formOnValuesChange?.(); });
    const saved = order("BASE");
    saved.备注一 = "saved-note";
    await act(async () => { updateRequest.resolve(saved); await updateRequest.promise; });

    expect(pageMock.formValues.备注一).toBe("saved-note");
    expect(pageMock.formValues.电脑单号).toBe("BASE");
  });

  it("keeps a save request mutually exclusive after later form edits", async () => {
    pageMock.get.mockResolvedValueOnce(order("BASE"));
    await pickOrder("BASE");
    await settle();
    const updateRequest = deferred<ReturnType<typeof order>>();
    pageMock.update.mockImplementationOnce(() => updateRequest.promise);

    await act(async () => { latestButton("保存").onClick?.(); });
    await act(async () => { pageMock.formOnValuesChange?.(); });
    await act(async () => { latestButton("保存").onClick?.(); });

    expect(pageMock.update).toHaveBeenCalledTimes(1);
    expect(latestButton("保存").loading).toBe(true);
    await act(async () => { updateRequest.resolve(order("BASE")); await updateRequest.promise; });
    expect(latestButton("保存").loading).toBe(false);
  });

  it("locks navigation and editing until an in-flight create is applied", async () => {
    pageMock.get.mockResolvedValueOnce(order("SOURCE")).mockResolvedValueOnce(order("CREATED"));
    await pickOrder("SOURCE");
    await settle();
    await act(async () => { latestButton("复制单").onClick?.(); });
    const createRequest = deferred<{ 电脑单号: string }>();
    pageMock.create.mockImplementationOnce(() => createRequest.promise);
    await act(async () => { latestButton("保存").onClick?.(); });

    expect(latestButton("新建").disabled).toBe(true);
    expect(latestButton("打开").disabled).toBe(true);
    expect(latestButton("审核").disabled).toBe(true);
    expect(latestFormItem("日期").child?.props.disabled).toBe(true);
    const row = latestTable().dataSource?.[0] ?? {};
    const accessoryColumn = latestTable().columns?.find(column => column.title === "配件编号");
    const accessoryEditor = accessoryColumn?.render?.(undefined, row) as ReactElement<{ disabled?: boolean; readOnly?: boolean }>;
    expect(accessoryEditor.props.disabled).toBe(true);
    expect(accessoryEditor.props.readOnly).toBe(true);

    await act(async () => { latestButton("新建").onClick?.(); });
    await act(async () => { createRequest.resolve({ 电脑单号: "CREATED" }); await createRequest.promise; });
    await settle();

    expect(pageMock.formValues.电脑单号).toBe("CREATED");
    expect(latestTable().dataSource?.[0]?.配件编号).toBe("CREATED-part");
  });

  it("blocks opening another order until an in-flight delete finishes", async () => {
    pageMock.get.mockResolvedValueOnce(order("DELETE-ME")).mockResolvedValueOnce(order("KEEP-ME"));
    await pickOrder("DELETE-ME");
    await settle();
    const deleteRequest = deferred<unknown>();
    pageMock.remove.mockImplementationOnce(() => deleteRequest.promise);
    await act(async () => { latestDeleteConfirm().onConfirm?.(); });
    expect(latestButton("打开").disabled).toBe(true);
    await pickOrder("KEEP-ME");
    await settle();
    await act(async () => { deleteRequest.resolve({}); await deleteRequest.promise; });

    expect(pageMock.formValues.电脑单号).toBeUndefined();
    expect(latestTable().dataSource?.[0]?.配件编号).toBe("");
  });

  it("is fully read-only without save permission while open and print stay available", async () => {
    pageMock.perms = { 半成品标签单: { 打开: true, 保存: false, 删除: true, 审核: true, 反审核: true, 打印: true } };
    await remountPage();
    pageMock.get.mockResolvedValueOnce(order("READONLY"));
    await pickOrder("READONLY");
    await settle();

    expect(latestButton("打开").disabled).not.toBe(true);
    expect(latestButton("打印").disabled).toBe(false);
    expect(latestButton("新建").disabled).toBe(true);
    expect(latestButton("保存").disabled).toBe(true);
    expect(latestButton("复制单").disabled).toBe(true);
    expect(latestFormItem("日期").child?.props.disabled).toBe(true);
    expect(latestFormItem("备注一").child?.props.disabled).toBe(true);

    const row = latestTable().dataSource?.[0] ?? {};
    const quantity = latestTable().columns?.find(column => column.title === "数量");
    const quantityEditor = quantity?.render?.(10, row) as ReactElement<{ disabled?: boolean }>;
    expect(quantityEditor.props.disabled).toBe(true);
    const deleteColumn = latestTable().columns?.find(column => column.title === "删除");
    const deleteButton = deleteColumn?.render?.(undefined, row) as ReactElement<{ disabled?: boolean }>;
    expect(deleteButton.props.disabled).toBe(true);
    expect(latestButton("删除").disabled).toBe(false);
    expect(latestFormItem("审核状态").child?.props.children).toBe("未审核");
    const productColumn = latestTable().columns?.find(column => column.title === "产品货号");
    const productEditor = productColumn?.render?.(undefined, row) as ReactElement<{ onClick?: () => void }>;
    await act(async () => { productEditor.props.onClick?.(); });
    expect(pageMock.productPicker?.open).toBe(false);
  });

  it("makes audit mutations mutually exclusive and reloads the final audited state", async () => {
    pageMock.get.mockResolvedValueOnce(order("AUDIT-ME"));
    await pickOrder("AUDIT-ME");
    await settle();
    const auditRequest = deferred<Record<string, never>>();
    pageMock.audit.mockImplementationOnce(() => auditRequest.promise);
    pageMock.get.mockResolvedValueOnce(order("AUDIT-ME", "1"));
    await act(async () => { latestButton("审核").onClick?.(); });
    await act(async () => { latestButton("审核").onClick?.(); });

    expect(pageMock.audit).toHaveBeenCalledTimes(1);
    expect(latestButton("审核").loading).toBe(true);
    expect(latestButton("反审核").disabled).toBe(true);
    await act(async () => { auditRequest.resolve({}); await auditRequest.promise; });
    await settle();
    expect(latestButton("审核").loading).toBe(false);
    expect(latestButton("反审核").disabled).toBe(false);
    expect(latestButton("保存").disabled).toBe(true);
  });

  it("serializes audit with save and delete mutations", async () => {
    pageMock.get.mockResolvedValueOnce(order("WRITE-LOCK"));
    await pickOrder("WRITE-LOCK");
    await settle();
    const updateRequest = deferred<ReturnType<typeof order>>();
    pageMock.update.mockImplementationOnce(() => updateRequest.promise);

    await act(async () => { latestButton("保存").onClick?.(); });
    expect(latestButton("审核").disabled).toBe(true);
    expect(latestButton("反审核").disabled).toBe(true);
    await act(async () => { latestButton("审核").onClick?.(); });
    await act(async () => { latestDeleteConfirm().onConfirm?.(); });

    expect(pageMock.audit).not.toHaveBeenCalled();
    expect(pageMock.remove).not.toHaveBeenCalled();
    await act(async () => { updateRequest.resolve(order("WRITE-LOCK")); await updateRequest.promise; });
    expect(latestButton("审核").disabled).toBe(false);
  });

  it("saves a draft with an empty per-box quantity and expected labels zero", async () => {
    const draft = order("DRAFT");
    draft.明细[0].每箱数量 = undefined as unknown as number;
    draft.明细[0].预计标签数 = 0;
    draft.明细[0].实需标签数 = 0;
    pageMock.get.mockResolvedValueOnce(draft);
    await pickOrder("DRAFT");
    await settle();
    await act(async () => { latestButton("复制单").onClick?.(); });
    pageMock.create.mockReturnValueOnce(new Promise(() => undefined));
    await act(async () => { latestButton("保存").onClick?.(); });

    expect(pageMock.create).toHaveBeenCalledTimes(1);
  });

  it("uses the current form date for print preview", async () => {
    pageMock.get.mockResolvedValueOnce(order("PRINT"));
    await pickOrder("PRINT");
    await settle();
    pageMock.formValues.日期 = dayjs("2026-08-09");
    await act(async () => { latestButton("打印").onClick?.(); });

    expect(pageMock.printPreview?.open).toBe(true);
    expect(pageMock.printPreview?.documentDate).toBe("2026-08-09");
  });

  it("marks the invalid line when print validation fails", async () => {
    const invalid = order("PRINT-INVALID");
    invalid.明细[0].每箱数量 = 0;
    pageMock.get.mockResolvedValueOnce(invalid);
    await pickOrder("PRINT-INVALID");
    await settle();

    await act(async () => { latestButton("打印").onClick?.(); });

    expect(latestTable().rowClassName?.(latestTable().dataSource?.[0] ?? {}, 0)).toContain("erp-row-error");
  });

  it("copies an audited order into an editable draft for the current operator", async () => {
    storage.set("erp_user", "copier");
    const audited = order("AUDITED-COPY", "1");
    audited.操作员 = "original";
    pageMock.get.mockResolvedValueOnce(audited);
    await pickOrder("AUDITED-COPY");
    await settle();

    expect(latestButton("复制单").disabled).toBe(false);
    await act(async () => { latestButton("复制单").onClick?.(); });
    expect(pageMock.formValues.电脑单号).toBeUndefined();
    expect(pageMock.formValues.操作员).toBe("copier");
    expect(latestButton("保存").disabled).toBe(false);
  });

  it("connects both print commands to one preview and registers the real route", () => {
    expect(pageSource).toContain("SemiFinishedLabelPrintPreview");
    expect(pageSource).toContain("setPrintPreviewOpen(true)");
    expect(pageSource).toContain("printPreviewOpen");
    expect(appSource).toContain('path="semi-finished-label-orders"');
    expect(appSource).toContain("<SemiFinishedLabelOrderPage />");
    expect(menuSource).toContain('M("半成品标签单", "/semi-finished-label-orders", "半成品标签单")');
  });
});
