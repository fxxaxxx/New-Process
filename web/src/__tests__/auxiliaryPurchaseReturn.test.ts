import { describe, expect, it } from "vitest";
import {
  applyAuxiliaryPurchaseReturnMaterialToLine,
  buildAuxiliaryPurchaseReturnPayload,
  compactAuxiliaryPurchaseReturnLines,
  createAuxiliaryPurchaseReturnLines,
  summarizeAuxiliaryPurchaseReturnLines,
} from "../utils/auxiliaryPurchaseReturn";

describe("辅料退仓单明细选择与保存载荷", () => {
  it("点击辅料名称后回填辅料资料字段", () => {
    const [line] = createAuxiliaryPurchaseReturnLines(1);

    expect(applyAuxiliaryPurchaseReturnMaterialToLine(line, {
      ID: 9,
      物料类别: "辅料资料",
      物料编号: "FL-001",
      物料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      单价: 1.2,
      码换算: "366",
      备注: "常用",
    })).toMatchObject({
      辅料编号: "FL-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      每单位数值: "366",
      单价类型: "人民币",
      单位: "卷",
      数量: 0,
      单价: 1.2,
      备注: "",
    });
  });

  it("保存时固定写辅料仓库、辅料资料和入仓单号", () => {
    const lines = createAuxiliaryPurchaseReturnLines(3);
    const payload = buildAuxiliaryPurchaseReturnPayload({
      supplierNo: "0076",
      supplierName: "东莞市沃轩实业有限公司",
      date: "2026-07-09",
      receiptNo: "CG20260709001",
      note: "退多余辅料",
      lines: [
        { ...lines[0], 辅料编号: "A001", 辅料名称: "胶纸", 单位: "卷", 数量: 3, 单价: 2 },
        { ...lines[1], 辅料编号: "A002", 辅料名称: "贴纸", 数量: 0 },
        { ...lines[2], 辅料名称: "无编号", 数量: 5 },
      ],
    });

    expect(payload).toMatchObject({
      入仓单号: "CG20260709001",
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      日期: "2026-07-09",
      仓库: "辅料仓库",
      备注: "退多余辅料",
    });
    expect(payload.明细).toEqual([
      {
        物料编号: "A001",
        物料名称: "胶纸",
        物料类别: "辅料资料",
        规格: undefined,
        颜色: undefined,
        单位: "卷",
        数量: 3,
        单价: 2,
        金额: 6,
        备注: undefined,
      },
    ]);
  });

  it("底部合计和删除空白行只保留有效辅料", () => {
    const lines = [
      { key: 1, 序号: 1, 辅料编号: "A", 辅料名称: "胶纸", 数量: 2, 单价: 3 },
      { key: 2, 序号: 2, 辅料编号: "B", 辅料名称: "贴纸", 数量: 4, 单价: 1.25 },
      { key: 3, 序号: 3, 数量: undefined, 单价: 99 },
    ];

    expect(summarizeAuxiliaryPurchaseReturnLines(lines)).toEqual({ 数量: 6, 金额: 11 });
    expect(compactAuxiliaryPurchaseReturnLines(lines).map(line => line.序号)).toEqual([1, 2]);
  });
});
