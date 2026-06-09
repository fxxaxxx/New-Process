import { describe, expect, it } from "vitest";
import { groupByCategory } from "../utils/adminPerms";

describe("管理后台权限分组", () => {
  it("groupByCategory 按组归集并保持首次出现顺序", () => {
    const rows = [
      { 组: "基础资料", 菜单: "客户" },
      { 组: "业务单据", 菜单: "客户订单" },
      { 组: "基础资料", 菜单: "供应商" },
      { 组: "业务单据", 菜单: "生产制单" },
    ];
    const out = groupByCategory(rows);
    expect(out.map((g) => g.组)).toEqual(["基础资料", "业务单据"]);
    expect(out[0].菜单行.map((r) => r.菜单)).toEqual(["客户", "供应商"]);
    expect(out[1].菜单行.map((r) => r.菜单)).toEqual(["客户订单", "生产制单"]);
  });

  it("groupByCategory 组缺失归入空字符串组", () => {
    const out = groupByCategory([{ 菜单: "X" }, { 菜单: "Y" }]);
    expect(out).toHaveLength(1);
    expect(out[0].组).toBe("");
    expect(out[0].菜单行).toHaveLength(2);
  });
});
