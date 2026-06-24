import { describe, expect, it } from "vitest";
import { buildCsv, type ExportCol } from "../utils/tableExport";

const cols: ExportCol[] = [
  { title: "单号", key: "单号" },
  { title: "数量", key: "数量" },
  { title: "审核", key: "审核", fmt: v => (v === "1" ? "已审核" : "未审核") },
];

describe("buildCsv", () => {
  it("表头 + 行，fmt 生效", () => {
    const csv = buildCsv(cols, [{ 单号: "POQ1", 数量: 100, 审核: "1" }]);
    expect(csv).toBe("单号,数量,审核\nPOQ1,100,已审核");
  });

  it("含逗号/引号/换行的字段被双引号包裹并转义", () => {
    const csv = buildCsv([{ title: "备注", key: "备注" }], [{ 备注: 'a,b"c\nd' }]);
    expect(csv).toBe('备注\n"a,b""c\nd"');
  });

  it("空/缺失值 → 空串", () => {
    const csv = buildCsv(cols, [{ 单号: "X" }]);
    expect(csv).toBe("单号,数量,审核\nX,,未审核");
  });
});
