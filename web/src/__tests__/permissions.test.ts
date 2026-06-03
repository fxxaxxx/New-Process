import { describe, expect, it } from "vitest";
import { can, hidePrice, type PermMap } from "../auth/permissions";

const map: PermMap = {
  成品入仓: { 打开: true, 保存: true, 删除: false, 打印: true,
            单价: false, 金额: true, 审核: true, 反审核: false, 功能: false },
};

describe("permissions", () => {
  it("can() reads a bit", () => {
    expect(can(map, "成品入仓", "审核")).toBe(true);
    expect(can(map, "成品入仓", "删除")).toBe(false);
    expect(can(map, "不存在", "打开")).toBe(false);
  });
  it("hidePrice() true when 单价 bit off", () => {
    expect(hidePrice(map, "成品入仓")).toBe(true); // 无单价权限 => 隐藏价格列
  });
});
