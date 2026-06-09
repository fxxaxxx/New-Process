import { describe, expect, it } from "vitest";
import { displayValue } from "../utils/sysConfig";

describe("系统参数 displayValue", () => {
  it("加密项显示 (已加密)", () => {
    expect(displayValue({ 是否加密: true, 值: null })).toBe("(已加密)");
    expect(displayValue({ 是否加密: true, 值: "明文" })).toBe("(已加密)");
  });
  it("明文项有值时显示值", () => {
    expect(displayValue({ 是否加密: false, 值: "abc" })).toBe("abc");
  });
  it("明文项值为 null/undefined 时显示空串", () => {
    expect(displayValue({ 是否加密: false, 值: null })).toBe("");
    expect(displayValue({ 是否加密: false })).toBe("");
  });
});
