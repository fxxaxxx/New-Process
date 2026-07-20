import { describe, expect, it } from "vitest";
import {
  applyAuxiliaryMaterialToLine,
  buildAuxiliaryPurchasePayload,
  createAuxiliaryPurchaseLines,
  summarizeAuxiliaryPurchaseLines,
} from "../utils/auxiliaryPurchaseOrder";

describe("辅料采购订单明细选择与保存载荷", () => {
  it("点击辅料资料后回填当前明细行", () => {
    const [line] = createAuxiliaryPurchaseLines(1);

    expect(applyAuxiliaryMaterialToLine(line, {
      ID: 7,
      物料类别: "辅料资料",
      物料编号: "MUGB-001",
      物料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      单价: 1.25,
      备注: "常用辅料",
      码换算: "366",
    })).toMatchObject({
      辅料编号: "MUGB-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      数量: 0,
      单价: 1.25,
      备注: "",
      每单位数值: "366",
    });
  });

  it("只把有辅料编号且数量大于 0 的明细生成采购订单载荷", () => {
    const lines = createAuxiliaryPurchaseLines(3);
    const filled = [
      { ...lines[0], 辅料编号: "A001", 辅料名称: "胶纸", 单位: "卷", 数量: 2, 单价: 3.5 },
      { ...lines[1], 辅料编号: "A002", 辅料名称: "贴纸", 数量: 0, 单价: 1 },
      { ...lines[2], 辅料名称: "空编号", 数量: 8 },
    ];

    expect(buildAuxiliaryPurchasePayload({
      supplierNo: "0076",
      supplierName: "东莞市沃轩实业有限公司",
      deliveryDate: "2026-07-08",
      note: "急",
      lines: filled,
    })).toEqual({
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      交货日期: "2026-07-08",
      仓库: "辅料仓库",
      备注: "急",
      明细: [
        {
          物料编号: "A001",
          物料名称: "胶纸",
          物料类别: "辅料资料",
          规格: undefined,
          颜色: undefined,
          单位: "卷",
          数量: 2,
          单价: 3.5,
          预算数量: 2,
        },
      ],
    });
  });

  it("按明细数量和单价汇总底部数量与金额", () => {
    expect(summarizeAuxiliaryPurchaseLines([
      { key: 1, 序号: 1, 辅料编号: "A", 数量: 2, 单价: 3 },
      { key: 2, 序号: 2, 辅料编号: "B", 数量: 4, 单价: 1.25 },
      { key: 3, 序号: 3, 数量: undefined, 单价: 99 },
    ])).toEqual({ 数量: 6, 金额: 11 });
  });
});
