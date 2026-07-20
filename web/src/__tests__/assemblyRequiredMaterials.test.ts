import { describe, expect, it } from "vitest";
import { buildRequiredMaterialQuery, requiredMaterialOrderPath } from "../utils/assemblyRequiredMaterials";

describe("装配需领明细表查询参数与双击跳转", () => {
  it("全部和空值不下发，关键字 trim，具体筛选保留", () => {
    expect(buildRequiredMaterialQuery({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: " SLB2601122 ",
      收货仓库: "全部",
      类型: "全部",
      审核情况: "已审核",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: "SLB2601122",
      收货仓库: undefined,
      类型: undefined,
      审核情况: "已审核",
    });

    expect(buildRequiredMaterialQuery({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: "   ",
      收货仓库: "半成品仓",
      类型: "未包装半成品",
      审核情况: "全部",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: undefined,
      收货仓库: "半成品仓",
      类型: "未包装半成品",
      审核情况: undefined,
    });
  });

  it("双击行打开对应装配加工单", () => {
    expect(requiredMaterialOrderPath({ 单号: "ZP 12/3" })).toBe(
      "/assembly-purchase-orders?单号=ZP%2012%2F3",
    );
    expect(requiredMaterialOrderPath({})).toBeUndefined();
  });
});
