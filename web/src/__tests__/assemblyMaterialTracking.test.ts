import { describe, expect, it } from "vitest";
import { buildMaterialTrackingQuery, materialTrackingOrderPath } from "../utils/assemblyMaterialTracking";

describe("装配物料跟踪表参数与跳转", () => {
  it("归一化查询条件：全部/空值不下发，关键字 trim，截止统计透传", () => {
    expect(buildMaterialTrackingQuery({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: " DS241204-01 ",
      收货仓库: "全部",
      截止统计: true,
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: "DS241204-01",
      收货仓库: undefined,
      截止统计: true,
    });

    expect(buildMaterialTrackingQuery({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: "   ",
      收货仓库: "半成品仓",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: undefined,
      收货仓库: "半成品仓",
      截止统计: false,
    });
  });

  it("双击行跳转到对应装配加工单", () => {
    expect(materialTrackingOrderPath({ 订单单号: "ZP 12/3" })).toBe(
      "/assembly-purchase-orders?单号=ZP%2012%2F3",
    );
    expect(materialTrackingOrderPath({})).toBeUndefined();
  });
});
