import { describe, expect, it } from "vitest";
import { isValidHm } from "../utils/attendance";

describe("班次管理", () => {
  it("isValidHm 校验 HH:mm 时间格式", () => {
    expect(isValidHm("08:00")).toBe(true);
    expect(isValidHm("25:00")).toBe(false);
    expect(isValidHm("")).toBe(false);
    expect(isValidHm("8:00")).toBe(false);
  });
});
