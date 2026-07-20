import { act, createElement, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { beforeEach, afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type {
  AuxiliaryStocktakeDetailRow,
  AuxiliaryStocktakeSummaryRow,
} from "../api/auxiliaryStocktakeQuery";
import { auxiliaryStocktakeQueryApi } from "../api/auxiliaryStocktakeQuery";
import { buildAuxiliaryStocktakeQuery } from "../utils/auxiliaryStocktakeQuery";
import AuxiliaryStocktakeQueryDetailDrawer from "../pages/auxiliary/AuxiliaryStocktakeQueryDetailDrawer";
import stocktakeQueryPageSource from "../pages/auxiliary/AuxiliaryStocktakeQueryPage.tsx?raw";

const clientMock = vi.hoisted(() => ({ get: vi.fn() }));
const antdMock = vi.hoisted(() => ({ warning: vi.fn(), error: vi.fn() }));

vi.mock("../api/client", () => ({ api: clientMock }));

vi.mock("antd", () => {
  const Drawer = ({ open, children }: { open: boolean; children?: ReactNode }) =>
    createElement("section", { "data-testid": "drawer", "data-open": String(open) }, children);
  const Descriptions = Object.assign(
    ({ children }: { children?: ReactNode }) => createElement("div", { "data-testid": "descriptions" }, children),
    {
      Item: ({ label, children }: { label: string; children?: ReactNode }) =>
        createElement("div", null, createElement("strong", null, `${label}:`), children),
    },
  );
  const Table = ({ dataSource, columns }: { dataSource: Record<string, unknown>[]; columns: { dataIndex?: string; title?: string }[] }) =>
    createElement(
      "table",
      { "data-testid": "table" },
      createElement("thead", null, createElement("tr", null, columns.map((column, columnIndex) =>
        createElement("th", { key: columnIndex }, column.title ?? column.dataIndex ?? ""),
      ))),
      createElement("tbody", null, dataSource.map((row, rowIndex) => createElement(
        "tr",
        { key: rowIndex },
        columns.map((column, columnIndex) => createElement(
          "td",
          { key: columnIndex },
          String((column.dataIndex ? row[column.dataIndex] : "") ?? ""),
        )),
      ))),
    );
  const Tag = ({ children }: { children?: ReactNode }) => createElement("span", null, children);
  return { Drawer, Descriptions, Table, Tag, message: antdMock };
});

class TestNode {
  nodeType = 1;
  nodeName: string;
  tagName: string;
  ownerDocument: TestDocument;
  parentNode: TestNode | null = null;
  childNodes: TestNode[] = [];
  style = { setProperty: () => undefined, removeProperty: () => undefined };
  private attributes = new Map<string, string>();
  private textValue = "";

  constructor(nodeName: string, ownerDocument: TestDocument) {
    this.nodeName = nodeName.toUpperCase();
    this.tagName = nodeName.toLowerCase();
    this.ownerDocument = ownerDocument;
  }

  appendChild<T extends TestNode>(child: T): T {
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  insertBefore<T extends TestNode>(child: T, before: TestNode | null): T {
    child.parentNode = this;
    const index = before ? this.childNodes.indexOf(before) : -1;
    if (index < 0) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    return child;
  }

  removeChild<T extends TestNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  setAttribute(name: string, value: string) { this.attributes.set(name, String(value)); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string) { this.attributes.delete(name); }
  addEventListener() { /* React event delegation only needs this surface in these tests. */ }
  removeEventListener() { /* React event delegation only needs this surface in these tests. */ }
  contains(node: TestNode | null): boolean { return node === this || this.childNodes.some(child => child.contains(node)); }
  get firstChild() { return this.childNodes[0] ?? null; }
  get lastChild(): TestNode | null { return this.childNodes.at(-1) ?? null; }
  get textContent() { return this.textValue + this.childNodes.map(child => child.textContent).join(""); }
  set textContent(value: string | null) { this.textValue = value ?? ""; this.childNodes = []; }
}

class TestText extends TestNode {
  nodeType = 3;
  constructor(value: string, ownerDocument: TestDocument) {
    super("#text", ownerDocument);
    this.textContent = value;
  }
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const detail = (number: string, warehouse = "辅料仓库") => ({
  单头: { id: 1, 单号: number, 日期: "2026-07-13", 仓库: warehouse, 操作员: "测试员", 审核: "1", 备注: "只读备注" },
  明细: [{ id: 1, 物料编号: "A001", 物料名称: "螺丝", 规格: "M3", 单位: "个", 系统数量: 10, 盘点数量: 9, 盈亏数量: -1 }],
});

let root: Root | undefined;
let container: TestNode;

beforeEach(() => {
  container = testDocument.createElement("div");
  testDocument.body.appendChild(container);
  clientMock.get.mockReset().mockResolvedValue({ data: [] });
  antdMock.warning.mockReset();
  antdMock.error.mockReset();
});

afterEach(() => {
  if (root) {
    act(() => root?.unmount());
    root = undefined;
  }
  testDocument.body.removeChild(container);
});

async function renderDrawer(props: { open: boolean; 单号?: string }) {
  await act(async () => {
    root = createRoot(container as unknown as Element);
    root?.render(createElement(AuxiliaryStocktakeQueryDetailDrawer, { ...props, onClose: vi.fn() }));
  });
}

async function rerenderDrawer(props: { open: boolean; 单号?: string }) {
  await act(async () => {
    root?.render(createElement(AuxiliaryStocktakeQueryDetailDrawer, { ...props, onClose: vi.fn() }));
  });
}

describe("辅料盘点查询契约", () => {
  beforeEach(() => {
    clientMock.get.mockClear();
  });

  it(" trims keyword and forwards the date range", () => {
    expect(buildAuxiliaryStocktakeQuery({
      start: "2026-07-01",
      end: "2026-07-31",
      keyword: "  A001  ",
      audit: "全部",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: "A001",
    });
  });

  it("omits empty keyword and the all-audit option", () => {
    expect(buildAuxiliaryStocktakeQuery({ keyword: "   ", audit: "全部" })).toEqual({});
  });

  it("maps an audited filter to the backend audit parameter", () => {
    expect(buildAuxiliaryStocktakeQuery({ audit: "已审核" })).toEqual({
      审核情况: "已审核",
    });
  });

  it("trims and forwards a selected material category", () => {
    expect(buildAuxiliaryStocktakeQuery({ category: "  五金  " })).toEqual({
      物料类别: "五金",
    });
  });

  it("omits an empty or all material category", () => {
    expect(buildAuxiliaryStocktakeQuery({ category: "   " })).toEqual({});
    expect(buildAuxiliaryStocktakeQuery({ category: " 全部 " })).toEqual({});
  });

  it("omits date bounds that contain only whitespace", () => {
    expect(buildAuxiliaryStocktakeQuery({ start: "   ", end: "  " })).toEqual({});
  });

  it("defines detail rows as summary rows with document fields", () => {
    const summary: AuxiliaryStocktakeSummaryRow = {
      物料编号: "A001",
      物料名称: "辅料",
      规格: "规格",
      单位: "个",
      系统数量: 10,
      盘点数量: 9,
      盈亏数量: -1,
    };
    const detail: AuxiliaryStocktakeDetailRow = {
      ...summary,
      日期: "2026-07-01",
      单号: "PD001",
      备注: "备注",
      审核: "已审核",
    };

    expect(detail).toMatchObject(summary);
    expect(detail.单号).toBe("PD001");
  });

  it("keeps the detail row type compatible with the summary row type", () => {
    expectTypeOf<AuxiliaryStocktakeDetailRow>().toMatchTypeOf<AuxiliaryStocktakeSummaryRow>();
    expectTypeOf<AuxiliaryStocktakeSummaryRow["系统数量"]>()
      .toEqualTypeOf<number | null | undefined>();
    expectTypeOf<AuxiliaryStocktakeSummaryRow["盘点数量"]>()
      .toEqualTypeOf<number | null | undefined>();
    expectTypeOf<AuxiliaryStocktakeSummaryRow["盈亏数量"]>()
      .toEqualTypeOf<number | null | undefined>();
  });

  it("gets summary and detail with the supplied params unchanged", async () => {
    const params = { 起: "2026-07-01", 止: "2026-07-31", keyword: "A001" };

    await auxiliaryStocktakeQueryApi.summary(params);
    await auxiliaryStocktakeQueryApi.detail(params);

    expect(clientMock.get.mock.calls).toEqual([
      ["/auxiliary-stocktake-query/summary", { params }],
      ["/auxiliary-stocktake-query/detail", { params }],
    ]);
  });

  it("gets a document through the auxiliary permission boundary", async () => {
    await auxiliaryStocktakeQueryApi.get("PD / 001");

    expect(clientMock.get).toHaveBeenCalledWith("/auxiliary-stocktake-query/PD%20%2F%20001");
  });

  it("mounts, loads by document number, and renders the auxiliary header and lines", async () => {
    const pending = deferred<ReturnType<typeof detail>>();
    clientMock.get.mockReturnValue(pending.promise.then(data => ({ data })));

    await renderDrawer({ open: true, 单号: "A-001" });
    expect(clientMock.get).toHaveBeenCalledWith("/auxiliary-stocktake-query/A-001");

    await act(async () => {
      pending.resolve(detail("A-001"));
      await pending.promise;
    });

    expect(container.textContent).toContain("A-001");
    expect(container.textContent).toContain("螺丝");
    expect(container.textContent).toContain("系统数量");
    expect(container.textContent).toContain("10");
    expect(container.textContent).toContain("盘点数量");
    expect(container.textContent).toContain("9");
    expect(container.textContent).toContain("盈亏数量");
    expect(container.textContent).toContain("-1");
    expect(container.textContent).toContain("已审核");
  });

  it("clears old data and warns when the response is not from the auxiliary warehouse", async () => {
    const first = deferred<ReturnType<typeof detail>>();
    const second = deferred<ReturnType<typeof detail>>();
    clientMock.get
      .mockReturnValueOnce(first.promise.then(data => ({ data })))
      .mockReturnValueOnce(second.promise.then(data => ({ data })));

    await renderDrawer({ open: true, 单号: "A-001" });
    await act(async () => { first.resolve(detail("A-001")); await first.promise; });
    await rerenderDrawer({ open: true, 单号: "B-001" });
    await act(async () => { second.resolve(detail("B-001", "主仓库")); await second.promise; });

    expect(container.textContent).not.toContain("A-001");
    expect(container.textContent).not.toContain("螺丝");
    expect(antdMock.warning).toHaveBeenCalledWith("该盘点单不是辅料仓库单据");
  });

  it("clears old data and shows an error when loading rejects", async () => {
    const first = deferred<ReturnType<typeof detail>>();
    const second = deferred<ReturnType<typeof detail>>();
    clientMock.get
      .mockReturnValueOnce(first.promise.then(data => ({ data })))
      .mockReturnValueOnce(second.promise.then(data => ({ data })));

    await renderDrawer({ open: true, 单号: "A-001" });
    await act(async () => { first.resolve(detail("A-001")); await first.promise; });
    await rerenderDrawer({ open: true, 单号: "B-001" });
    await act(async () => {
      second.reject(new Error("network"));
      await second.promise.catch(() => undefined);
    });

    expect(container.textContent).not.toContain("A-001");
    expect(container.textContent).not.toContain("螺丝");
    expect(antdMock.error).toHaveBeenCalledWith("加载辅料盘点单失败");
  });

  it("does not write a deferred response after the drawer closes", async () => {
    const pending = deferred<ReturnType<typeof detail>>();
    clientMock.get.mockReturnValue(pending.promise.then(data => ({ data })));

    await renderDrawer({ open: true, 单号: "A-001" });
    await rerenderDrawer({ open: false });
    await act(async () => { pending.resolve(detail("A-001")); await pending.promise; });

    expect(container.textContent).not.toContain("A-001");
    expect(container.textContent).not.toContain("螺丝");
  });

  it("keeps the newer document when the older request resolves later", async () => {
    const first = deferred<ReturnType<typeof detail>>();
    const second = deferred<ReturnType<typeof detail>>();
    clientMock.get
      .mockReturnValueOnce(first.promise.then(data => ({ data })))
      .mockReturnValueOnce(second.promise.then(data => ({ data })));

    await renderDrawer({ open: true, 单号: "A-001" });
    await rerenderDrawer({ open: true, 单号: "B-001" });
    await act(async () => { second.resolve(detail("B-001")); await second.promise; });
    expect(container.textContent).toContain("B-001");
    expect(container.textContent).not.toContain("A-001");

    await act(async () => { first.resolve(detail("A-001")); await first.promise; });
    expect(container.textContent).toContain("B-001");
    expect(container.textContent).not.toContain("A-001");
  });

  it("uses the shared report layout and opens the auxiliary drawer on detail-row double click", () => {
    expect(stocktakeQueryPageSource).toContain("AuxiliaryReportLayout");
    expect(stocktakeQueryPageSource).toContain("AuxiliaryStocktakeQueryDetailDrawer");
    expect(stocktakeQueryPageSource).toContain("onDoubleClick");
    expect(stocktakeQueryPageSource).toContain('can(perms, MENU, "打开")');
  });
});
