import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import { semiFinishedLabelOrdersApi } from "../api/semiFinishedLabelOrders";
import type {
  SemiFinishedLabelOrder,
  SemiFinishedLabelOrderListRow,
} from "../api/semiFinishedLabelOrders";
import {
  calculateExpectedLabels,
  expandPrintableLabels,
  markActualLabelsEdited,
  mergeSelectedProducts,
  recalculateLine,
  validateLabelOrder,
} from "../utils/semiFinishedLabelOrders";
import type { LabelLine } from "../utils/semiFinishedLabelOrders";
import * as labelOrderUtils from "../utils/semiFinishedLabelOrders";

const clientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("../api/client", () => ({ api: clientMock }));

const line = (patch: Partial<LabelLine> = {}): LabelLine => ({
  配件编号: "ACC-1",
  客户: "客户 A",
  产品货号: "P-1",
  产品名称: "产品一",
  产品装配名称: "装配一",
  数量: 25,
  每箱数量: 10,
  预计标签数: 3,
  实需标签数: 3,
  实需标签数已手改: false,
  ...patch,
});

describe("半成品标签单前端领域", () => {
  beforeEach(() => {
    clientMock.get.mockReset().mockResolvedValue({ data: {} });
    clientMock.post.mockReset().mockResolvedValue({ data: {} });
    clientMock.put.mockReset().mockResolvedValue({ data: {} });
    clientMock.delete.mockReset().mockResolvedValue({ data: {} });
  });

  it("calculates expected labels with ceiling and rejects invalid per-box values", () => {
    expect(calculateExpectedLabels(25, 10)).toBe(3);
    expect(calculateExpectedLabels(0, 10)).toBe(0);
    expect(calculateExpectedLabels(25, 0)).toBe(0);
    expect(calculateExpectedLabels(25, -1)).toBe(0);
    expect(calculateExpectedLabels(25, Number.NaN)).toBe(0);
  });

  it("recalculates quantity and per-box while preserving manually edited actual labels", () => {
    expect(recalculateLine(line(), { 数量: 31 })).toMatchObject({
      数量: 31,
      预计标签数: 4,
      实需标签数: 4,
      实需标签数已手改: false,
    });
    expect(recalculateLine(
      line({ 实需标签数: 7, 实需标签数已手改: true }),
      { 每箱数量: 20 },
    )).toMatchObject({
      每箱数量: 20,
      预计标签数: 2,
      实需标签数: 7,
      实需标签数已手改: true,
    });
  });

  it("marks actual labels as manual and validates non-negative integers", () => {
    expect(markActualLabelsEdited(line(), 5)).toMatchObject({
      实需标签数: 5,
      实需标签数已手改: true,
    });
    expect(validateLabelOrder({ 明细: [line({ 实需标签数: -1 })] })).toEqual([
      expect.objectContaining({ 字段: "明细[0].实需标签数" }),
    ]);
    expect(validateLabelOrder({ 明细: [line({ 实需标签数: 1.5 })] })).toEqual([
      expect.objectContaining({ 字段: "明细[0].实需标签数" }),
    ]);
  });

  it.each([null, undefined])(
    "allows an empty per-box quantity %s in a saved draft when expected labels are zero",
    每箱数量 => {
      const issues = validateLabelOrder({ 明细: [line({ 每箱数量, 预计标签数: 0 })] });

      expect(issues).not.toEqual([
        expect.objectContaining({ 字段: "明细[0].每箱数量" }),
      ]);
      expect(issues).toEqual([]);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])(
    "rejects a non-empty invalid per-box quantity %s in a saved draft",
    每箱数量 => {
      const issues = validateLabelOrder({ 明细: [line({ 每箱数量 })] });

      expect(issues).toEqual([
        expect.objectContaining({ 字段: "明细[0].每箱数量" }),
      ]);
    },
  );

  it("requires a positive per-box quantity for printing", () => {
    const validateForPrint = (labelOrderUtils as unknown as {
      validateLabelOrderForPrint?: typeof validateLabelOrder;
    }).validateLabelOrderForPrint;
    expect(validateForPrint).toBeTypeOf("function");
    if (!validateForPrint) return;

    expect(validateForPrint({ 明细: [line({ 每箱数量: undefined, 预计标签数: 0 })] })).toEqual([
      expect.objectContaining({ 字段: "明细[0].每箱数量" }),
    ]);
  });

  it.each([-1, 1.5, 4])(
    "rejects invalid or stale expected label count %s",
    预计标签数 => {
      const issues = validateLabelOrder({ 明细: [line({ 预计标签数 })] });

      expect(issues).toEqual([
        expect.objectContaining({ 字段: "明细[0].预计标签数" }),
      ]);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-finite quantity %s",
    数量 => {
      expect(validateLabelOrder({ 明细: [line({ 数量 })] })).toEqual([
        expect.objectContaining({ 字段: "明细[0].数量" }),
      ]);
    },
  );

  it.each([Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects non-finite actual label count %s",
    实需标签数 => {
      expect(validateLabelOrder({ 明细: [line({ 实需标签数 })] })).toEqual([
        expect.objectContaining({ 字段: "明细[0].实需标签数" }),
      ]);
    },
  );

  it("merges selected products by trimmed accessory number and recalculates totals", () => {
    const merged = mergeSelectedProducts(
      [line({ 配件编号: " ACC-1 ", 数量: 5, 预计标签数: 1, 实需标签数: 1 })],
      [
        {
          配件编号: "ACC-1",
          客户: "客户 A",
          产品货号: "P-2",
          产品名称: "产品二",
          产品装配名称: "装配二",
          数量: 20,
          每箱数量: 10,
        },
      ],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({
      配件编号: "ACC-1",
      数量: 25,
      每箱数量: 10,
      预计标签数: 3,
      实需标签数: 3,
      实需标签数已手改: false,
    });
  });

  it("preserves manually edited actual labels while merging and recalculating expected labels", () => {
    const merged = mergeSelectedProducts(
      [line({ 数量: 5, 预计标签数: 1, 实需标签数: 8, 实需标签数已手改: true })],
      [{ 配件编号: " ACC-1 ", 产品货号: "P-2", 数量: 20, 每箱数量: 10 }],
    );

    expect(merged[0]).toMatchObject({
      数量: 25,
      预计标签数: 3,
      实需标签数: 8,
      实需标签数已手改: true,
    });
  });

  it("merges accessory numbers case-insensitively while preserving the first display value", () => {
    const merged = mergeSelectedProducts(
      [line({ 配件编号: "Acc-1", 数量: 5 })],
      [{ 配件编号: "ACC-1", 产品货号: "P-2", 数量: 10, 每箱数量: 10 }],
    );

    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ 配件编号: "Acc-1", 数量: 15 });
  });

  it("expands printable labels and skips zero-label lines", () => {
    const labels = expandPrintableLabels([
      line({ 实需标签数: 2 }),
      line({ 配件编号: "ACC-2", 实需标签数: 0 }),
    ]);
    expect(labels).toHaveLength(2);
    expect(labels.map(item => item.序号)).toEqual([1, 2]);
    expect(labels[0]).toMatchObject({ 配件编号: "ACC-1", 总标签数: 2 });
  });

  it("covers CRUD, audit, adjacent, and product query endpoints", async () => {
    const save = { 日期: "2026-07-14", 明细: [line()] };
    await semiFinishedLabelOrdersApi.list(2, 30, " SBL ");
    await semiFinishedLabelOrdersApi.get("SBL/A");
    await semiFinishedLabelOrdersApi.create(save);
    await semiFinishedLabelOrdersApi.update("SBL/A", save);
    await semiFinishedLabelOrdersApi.remove("SBL/A");
    await semiFinishedLabelOrdersApi.audit("SBL/A");
    await semiFinishedLabelOrdersApi.reverseAudit("SBL/A");
    await semiFinishedLabelOrdersApi.adjacent("SBL/A", "next");
    await semiFinishedLabelOrdersApi.products({ field: "配件编号", keyword: "ACC", exact: true });

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/semi-finished-label-orders", {
      params: { page: 2, size: 30, keyword: " SBL " },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/semi-finished-label-orders/SBL%2FA");
    expect(clientMock.put).toHaveBeenCalledWith("/semi-finished-label-orders/SBL%2FA", save);
    expect(clientMock.delete).toHaveBeenCalledWith("/semi-finished-label-orders/SBL%2FA");
    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/semi-finished-label-orders", save);
    expect(clientMock.post).toHaveBeenNthCalledWith(2, "/semi-finished-label-orders/SBL%2FA/audit");
    expect(clientMock.post).toHaveBeenNthCalledWith(3, "/semi-finished-label-orders/SBL%2FA/reverse-audit");
    expect(clientMock.get).toHaveBeenNthCalledWith(3, "/semi-finished-label-orders/SBL%2FA/adjacent", {
      params: { direction: "next" },
    });
    expect(clientMock.get).toHaveBeenNthCalledWith(4, "/semi-finished-label-orders/products", {
      params: { field: "配件编号", keyword: "ACC", exact: true },
    });
  });

  it("maps an adjacent 204 response to undefined", async () => {
    clientMock.get.mockResolvedValueOnce({ status: 204, data: null });

    expect(await semiFinishedLabelOrdersApi.adjacent("SBL/A", "previous")).toBeUndefined();
    expectTypeOf<Awaited<ReturnType<typeof semiFinishedLabelOrdersApi.adjacent>>>()
      .toEqualTypeOf<SemiFinishedLabelOrder | undefined>();
  });

  it("keeps the list row contract aligned with the backend DTO", () => {
    expectTypeOf<keyof SemiFinishedLabelOrderListRow>().toEqualTypeOf<
      "ID" | "电脑单号" | "日期" | "操作员" | "审核" |
      "审核人" | "审核时间" | "备注一" | "备注二"
    >();
    expectTypeOf<SemiFinishedLabelOrderListRow["审核人"]>().toEqualTypeOf<string | null>();
    expectTypeOf<SemiFinishedLabelOrderListRow["审核时间"]>().toEqualTypeOf<string | null>();
    expectTypeOf<SemiFinishedLabelOrderListRow["备注一"]>().toEqualTypeOf<string | null>();
    expectTypeOf<SemiFinishedLabelOrderListRow["备注二"]>().toEqualTypeOf<string | null>();
  });
});
