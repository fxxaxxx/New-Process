import { describe, expect, it } from "vitest";
import { buildFactoryCategoryMonthlyQuery } from "../utils/assemblyFactoryCategoryMonthly";

describe("加工厂分类月报表查询参数", () => {
  it("全部和空值不下发，日期和关键字保留", () => {
    expect(buildFactoryCategoryMonthlyQuery({
      起: "2026-07-01",
      止: "2026-07-31",
      加工厂: "全部",
      keyword: "  华登 ",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      加工厂: undefined,
      keyword: "华登",
    });

    expect(buildFactoryCategoryMonthlyQuery({
      起: "2026-07-01",
      止: "2026-07-31",
      加工厂: "0126 邵阳市华登塑胶制品有限公司",
      keyword: "   ",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      加工厂: "0126 邵阳市华登塑胶制品有限公司",
      keyword: undefined,
    });
  });
});
