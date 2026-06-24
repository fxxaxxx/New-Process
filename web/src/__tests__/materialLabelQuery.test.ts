import { describe, expect, it } from "vitest";
import { ALL_APPROVAL, ALL_CAT, buildLabelQuery } from "../utils/materialLabelQuery";

describe("来料标签查询·参数归一化", () => {
  it("空筛选 → 全部 undefined", () => {
    expect(buildLabelQuery({})).toEqual({
      keyword: undefined, 物料类别: undefined, 审核情况: undefined, 起: undefined, 止: undefined,
    });
  });

  it("ALL 分类 / 全部审核 → 不下发", () => {
    const q = buildLabelQuery({ selKey: ALL_CAT, 审核情况: ALL_APPROVAL });
    expect(q.物料类别).toBeUndefined();
    expect(q.审核情况).toBeUndefined();
  });

  it("选中类别 / 已审核 → 下发", () => {
    const q = buildLabelQuery({ selKey: "布料", 审核情况: "已审核" });
    expect(q.物料类别).toBe("布料");
    expect(q.审核情况).toBe("已审核");
  });

  it("keyword 空格 → undefined，有值 trim；日期透传", () => {
    expect(buildLabelQuery({ keyword: "  " }).keyword).toBeUndefined();
    expect(buildLabelQuery({ keyword: " MLAB ", 起: "2026-03-01", 止: "2026-03-31" })).toMatchObject({
      keyword: "MLAB", 起: "2026-03-01", 止: "2026-03-31",
    });
  });
});
