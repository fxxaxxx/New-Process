import { describe, expect, it } from "vitest";
import { buildFactoryInventoryQuery } from "../utils/assemblyFactoryInventory";

describe("加工厂库存汇总表查询参数", () => {
  it("全部和空值不下发，日期不选择时不下发起止日期", () => {
    expect(buildFactoryInventoryQuery({
      启用日期: false,
      起: "2026-07-01",
      止: "2026-07-31",
      截止日期: "2026-07-08",
      加工厂: "全部",
      物料分类: "全部",
      收货仓库: "全部",
      keyword: " 01223 ",
    })).toEqual({
      启用日期: false,
      起: undefined,
      止: undefined,
      截止日期: "2026-07-08",
      加工厂: undefined,
      物料分类: undefined,
      收货仓库: undefined,
      keyword: "01223",
    });
  });

  it("日期选择时下发起止日期，具体筛选项保留", () => {
    expect(buildFactoryInventoryQuery({
      启用日期: true,
      起: "2026-07-01",
      止: "2026-07-31",
      截止日期: "2026-07-08",
      加工厂: "0126 邵阳市华登塑胶制品有限公司",
      物料分类: "PET",
      收货仓库: "半成品仓",
    })).toEqual({
      启用日期: true,
      起: "2026-07-01",
      止: "2026-07-31",
      截止日期: "2026-07-08",
      加工厂: "0126 邵阳市华登塑胶制品有限公司",
      物料分类: "PET",
      收货仓库: "半成品仓",
      keyword: undefined,
    });
  });
});
