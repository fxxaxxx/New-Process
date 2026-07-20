import { describe, expect, it } from "vitest";
import { expandPrintableLabels } from "../utils/semiFinishedLabelOrders";
import componentSource from "../pages/semi/SemiFinishedLabelPrintPreview.tsx?raw";

const line = (actual: number) => ({
  序号: 1,
  配件编号: "AAA00028",
  客户: "ZURU",
  产品货号: "9215",
  产品名称: "共用物料-MA",
  产品装配名称: "共用物料-MA 外发",
  数量: 30,
  每箱数量: 10,
  预计标签数: 3,
  实需标签数: actual,
});

describe("半成品标签打印预览", () => {
  it("跳过实需标签数为 0 的明细并按实需数量展开", () => {
    expect(expandPrintableLabels([line(0)])).toHaveLength(0);
    expect(expandPrintableLabels([line(3)])).toHaveLength(3);
  });

  it("提供统一预览、标签关键信息、张数序号和浏览器打印", () => {
    expect(componentSource).toContain("SemiFinishedLabelPrintPreview");
    expect(componentSource).toContain("产品货号");
    expect(componentSource).toContain("产品名称");
    expect(componentSource).toContain("产品装配名称");
    expect(componentSource).toContain("配件编号");
    expect(componentSource).toContain("客户");
    expect(componentSource).toContain("标签序号");
    expect(componentSource).toContain("window.print()");
    expect(componentSource).toContain("实需标签数必须是非负整数");
  });
});
