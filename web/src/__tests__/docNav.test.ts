import { describe, expect, it } from "vitest";
import { adjacentDocNo } from "../utils/docNav";

describe("adjacentDocNo 前单/后单定位", () => {
  const nos = ["FL0003", "FL0001", "FL0002", "FL0010"];

  it("前单取单号升序序列中的上一张（更早录入）", () => {
    expect(adjacentDocNo(nos, "FL0002", false)).toBe("FL0001");
  });

  it("后单取单号升序序列中的下一张（更晚录入）", () => {
    expect(adjacentDocNo(nos, "FL0002", true)).toBe("FL0003");
  });

  it("数字段按数值比较而非纯字符串比较", () => {
    expect(adjacentDocNo(nos, "FL0003", true)).toBe("FL0010");
  });

  it("到边界时返回 undefined", () => {
    expect(adjacentDocNo(nos, "FL0001", false)).toBeUndefined();
    expect(adjacentDocNo(nos, "FL0010", true)).toBeUndefined();
  });

  it("当前单号不在列表中返回 undefined", () => {
    expect(adjacentDocNo(nos, "FL9999", true)).toBeUndefined();
  });

  it("忽略空单号并去重", () => {
    expect(adjacentDocNo(["A2", undefined, null, "", "A1", "A1"], "A1", true)).toBe("A2");
  });
});
