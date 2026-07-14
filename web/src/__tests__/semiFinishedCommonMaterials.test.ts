import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BomSave, StyleMaterialsView } from "../api/styles";
import { semiFinishedCommonMaterialsApi } from "../api/semiFinishedCommonMaterials";
import {
  buildAssemblyMaterialDetailUrl,
  buildSemiFinishedCommonMaterialParams,
  createRequestVersionGuard,
  loadSemiFinishedCommonMaterialFilters,
  maskSemiFinishedCommonMaterialPrice,
  saveSemiFinishedCommonMaterialFilters,
} from "../utils/semiFinishedCommonMaterials";

const clientMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("../api/client", () => ({ api: clientMock }));

describe("半成品共用物料前端契约", () => {
  beforeEach(() => {
    clientMock.get.mockReset().mockResolvedValue({ data: { items: [], total: 0 } });
    clientMock.post.mockReset().mockResolvedValue({ data: undefined });
  });

  it("normalizes list params, filters, and preserves exact mode", () => {
    expect(buildSemiFinishedCommonMaterialParams({
      field: "产品货号",
      keyword: " A-1 ",
      exact: true,
      duplicate: "显示重复",
      pending: "待设置",
      audit: "未审核",
    })).toEqual({
      重复内容: "显示重复",
      待操作物料: "待设置",
      审核情况: "未审核",
      查询字段: "产品货号",
      keyword: "A-1",
      精确: true,
      page: 1,
      size: 50,
    });
  });

  it("omits blank optional filters while keeping pagination defaults", () => {
    expect(buildSemiFinishedCommonMaterialParams({
      field: "全部",
      keyword: "   ",
      duplicate: "全部",
      pending: "全部",
      audit: "全部",
    })).toEqual({ page: 1, size: 50, 精确: false });
  });

  it("builds an encoded assembly detail return URL", () => {
    expect(buildAssemblyMaterialDetailUrl("A/B"))
      .toBe("/assembly-material-setup?款号=A%2FB&return=%2Fsemi-finished-common-materials");
  });

  it("calls the dedicated list and audit endpoints", async () => {
    const params = { 查询字段: "产品货号", keyword: "A-1", page: 2, size: 25 } as const;
    await semiFinishedCommonMaterialsApi.list(params);
    await semiFinishedCommonMaterialsApi.audit("A/B");
    await semiFinishedCommonMaterialsApi.reverseAudit("A/B");

    expect(clientMock.get).toHaveBeenCalledWith("/semi-finished-common-materials", { params });
    expect(clientMock.post).toHaveBeenNthCalledWith(1, "/semi-finished-common-materials/A%2FB/audit");
    expect(clientMock.post).toHaveBeenNthCalledWith(2, "/semi-finished-common-materials/A%2FB/reverse-audit");
  });

  it("masks only unavailable prices", () => {
    expect(maskSemiFinishedCommonMaterialPrice(2.5, true)).toBe(2.5);
    expect(maskSemiFinishedCommonMaterialPrice(2.5, false)).toBe("***");
    expect(maskSemiFinishedCommonMaterialPrice(null, true)).toBe("***");
  });

  it("protects list state from stale responses with a request version", () => {
    const requests = createRequestVersionGuard();
    const first = requests.next();
    const second = requests.next();

    expect(requests.isCurrent(first)).toBe(false);
    expect(requests.isCurrent(second)).toBe(true);
  });

  it("round-trips filters through session storage and ignores malformed data", () => {
    const storage = new Map<string, string>();
    const session = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    } satisfies Pick<Storage, "getItem" | "setItem" | "removeItem">;
    const filters = { field: "客户", keyword: " A-1 ", exact: true, page: 3, size: 25 } as const;

    saveSemiFinishedCommonMaterialFilters(filters, session);
    expect(loadSemiFinishedCommonMaterialFilters(session)).toEqual(filters);

    session.setItem("semi-finished-common-materials.filters", "not-json");
    expect(loadSemiFinishedCommonMaterialFilters(session)).toEqual({});
  });

  it("keeps styles detail extensions and quotes optional and typed", () => {
    const view: StyleMaterialsView = {
      款号: "STYLE-1",
      款式: "产品一",
      物料: [{ id: 1, 物料编号: "MAT-1", 工模编号: "MOULD-1", 备注: "主盒彩盒" }],
      扩展: { 产品装配名称: "产品一装配", 调整审核: false },
      报价: [{ 合作方类型: "加工厂", 单价: 2.5, 报价日期: "2026-07-13" }],
    };

    expect(view.扩展?.产品装配名称).toBe("产品一装配");
    expect(view.报价?.[0].合作方类型).toBe("加工厂");

    const save: BomSave = {
      明细: [{ 物料编号: "MAT-1", 工模编号: "MOULD-1", 备注: "主盒彩盒" }],
      扩展: view.扩展,
      报价: view.报价,
    };
    expect(save.报价?.[0].单价).toBe(2.5);
  });
});
