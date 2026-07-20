import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  semiFinishedShortageAnalysisApi,
  type SemiFinishedShortageField,
  type SemiFinishedShortageResult,
  type SemiFinishedShortageRow,
} from "../api/semiFinishedShortageAnalysis";
import {
  DEFAULT_SHORTAGE_QUERY,
  downloadShortageExport,
  formatShortageQuantity,
  normalizeShortageQuery,
} from "../utils/semiFinishedShortageAnalysis";

const clientMock = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../api/client", () => ({ api: clientMock }));

describe("semi-finished shortage analysis API", () => {
  beforeEach(() => {
    clientMock.get.mockReset();
  });

  it("uses the product-code contains query by default", () => {
    expect(DEFAULT_SHORTAGE_QUERY).toEqual({
      field: "productCode",
      keyword: undefined,
      exact: false,
      page: 1,
      pageSize: 50,
    });
    expect(normalizeShortageQuery({})).toEqual(DEFAULT_SHORTAGE_QUERY);
  });

  it("trims a keyword and clamps paging", () => {
    expect(normalizeShortageQuery({
      field: "customer",
      keyword: "  客户甲  ",
      exact: true,
      page: 0,
      pageSize: 999,
    })).toEqual({
      field: "customer",
      keyword: "客户甲",
      exact: true,
      page: 1,
      pageSize: 200,
    });
  });

  it("turns a blank keyword into undefined and enforces the minimum page size", () => {
    expect(normalizeShortageQuery({ keyword: "   ", page: -5, pageSize: 0 })).toEqual({
      field: "productCode",
      keyword: undefined,
      exact: false,
      page: 1,
      pageSize: 1,
    });
  });

  it("defaults non-finite paging values before normalizing them", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(normalizeShortageQuery({ page: value, pageSize: value })).toMatchObject({
        page: DEFAULT_SHORTAGE_QUERY.page,
        pageSize: DEFAULT_SHORTAGE_QUERY.pageSize,
      });
    }
  });

  it("requests list and export with the same filter and a blob response", async () => {
    const query = {
      field: "partCode" as const,
      keyword: "A1",
      exact: false,
      page: 2,
      pageSize: 50,
    };
    clientMock.get.mockResolvedValueOnce({ data: { items: [], total: 0, page: 2, pageSize: 50 } });
    await semiFinishedShortageAnalysisApi.list(query);

    const blob = new Blob(["csv"]);
    clientMock.get.mockResolvedValueOnce({ data: blob });
    await semiFinishedShortageAnalysisApi.export(query);

    expect(clientMock.get).toHaveBeenNthCalledWith(1, "/semi-finished-shortage-analysis", { params: query });
    expect(clientMock.get).toHaveBeenNthCalledWith(2, "/semi-finished-shortage-analysis/export", {
      params: query,
      responseType: "blob",
    });
  });

  it("formats decimal quantities with grouping but no forced trailing zeroes", () => {
    expect(formatShortageQuantity(12)).toBe("12");
    expect(formatShortageQuantity(12.5)).toBe("12.5");
    expect(formatShortageQuantity(1234.25)).toBe("1,234.25");
  });

  it("downloads the export and releases its object URL", () => {
    const click = vi.fn();
    const createObjectURL = vi.fn(() => "blob:shortage-export");
    const revokeObjectURL = vi.fn();
    const originalDocument = globalThis.document;
    const originalURL = globalThis.URL;
    const anchor = { href: "", download: "", click };

    vi.stubGlobal("document", { createElement: vi.fn(() => anchor) });
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    try {
      downloadShortageExport(new Blob(["csv"]));
    } finally {
      vi.stubGlobal("document", originalDocument);
      vi.stubGlobal("URL", originalURL);
    }

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(anchor.href).toBe("blob:shortage-export");
    expect(anchor.download).toBe("半成品欠料分析表.csv");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:shortage-export");
  });

  it("keeps the field, row, and result contracts strictly typed", () => {
    expectTypeOf<SemiFinishedShortageField>().toEqualTypeOf<
      "productCode" | "productName" | "customer" | "partCode"
    >();
    expectTypeOf<keyof SemiFinishedShortageRow>().toEqualTypeOf<
      "customer" | "productCode" | "productName" | "partCode" | "assemblyName" | "unit" |
      "requiredQuantity" | "inventoryQuantity" | "shortageQuantity"
    >();
    expectTypeOf<keyof SemiFinishedShortageResult>().toEqualTypeOf<"items" | "total" | "page" | "pageSize">();
  });
});
