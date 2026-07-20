import { describe, expect, it } from "vitest";
import {
  applyAuxiliaryReceiptMaterialToLine,
  buildAuxiliaryReceiptPayload,
  compactAuxiliaryReceiptLines,
  createAuxiliaryReceiptLines,
  summarizeAuxiliaryReceiptLines,
} from "../utils/auxiliaryReceipt";

describe("辅料入仓单明细选择与保存载荷", () => {
  it("点击辅料名称后只回填辅料资料字段", () => {
    const [line] = createAuxiliaryReceiptLines(1);

    expect(applyAuxiliaryReceiptMaterialToLine(line, {
      ID: 8,
      物料类别: "辅料资料",
      物料编号: "MUGB-002",
      物料名称: "圆形贴纸",
      规格: "直径30MM",
      单位: "PCS",
      单价: 0.12,
      备注: "外箱贴",
      码换算: "1",
    })).toMatchObject({
      辅料编号: "MUGB-002",
      辅料名称: "圆形贴纸",
      规格: "直径30MM",
      每单位数值: "1",
      单价类型: "人民币",
      单位: "PCS",
      数量: 0,
      单价: 0.12,
      备注: "",
    });
  });

  it("保存时固定为辅料仓库和辅料资料，并把订单单号写入明细", () => {
    const lines = createAuxiliaryReceiptLines(3);
    const filled = [
      { ...lines[0], 辅料编号: "A001", 辅料名称: "胶纸", 单位: "卷", 数量: 2, 单价: 3.5, 备注: "首行" },
      { ...lines[1], 辅料编号: "A002", 辅料名称: "贴纸", 数量: 0, 单价: 1 },
      { ...lines[2], 辅料名称: "空编号", 数量: 8 },
    ];

    const payload = buildAuxiliaryReceiptPayload({
      supplierNo: "0076",
      supplierName: "东莞市沃轩实业有限公司",
      date: "2026-07-09",
      priceType: "人民币",
      orderNo: "PO26070901",
      note: "急",
      lines: filled,
    });

    expect(payload).toMatchObject({
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      日期: "2026-07-09",
      仓库: "辅料仓库",
      付款方式: "人民币",
      备注: "急",
    });
    expect(payload.明细).toEqual([
      {
        物料编号: "A001",
        物料名称: "胶纸",
        物料类别: "辅料资料",
        规格: undefined,
        颜色: undefined,
        单位: "卷",
        数量: 2,
        单价: 3.5,
        金额: 7,
        备注: "首行",
        订单单号: "PO26070901",
      },
    ]);
  });

  it("底部汇总和删除空白行只统计有效行", () => {
    const lines = [
      { key: 1, 序号: 1, 辅料编号: "A", 辅料名称: "胶纸", 数量: 2, 单价: 3 },
      { key: 2, 序号: 2, 辅料编号: "B", 辅料名称: "贴纸", 数量: 4, 单价: 1.25 },
      { key: 3, 序号: 3, 数量: undefined, 单价: 99 },
    ];

    expect(summarizeAuxiliaryReceiptLines(lines)).toEqual({ 数量: 6, 金额: 11 });
    expect(compactAuxiliaryReceiptLines(lines).map(line => line.序号)).toEqual([1, 2]);
  });
});
