import { describe, expect, it } from "vitest";
import {
  AUXILIARY_PURCHASE_PROGRESS_CATEGORY,
  buildAuxiliaryPurchaseProgressQuery,
  getAuxiliaryProgressTextColor,
  normalizeAuxiliaryPurchaseProgressRow,
} from "../utils/auxiliaryPurchaseProgress";

describe("辅料采购进度表查询与字段映射", () => {
  it("默认只查辅料资料，并按未到货生成欠数查询", () => {
    expect(buildAuxiliaryPurchaseProgressQuery({
      arrivalStatus: "未到",
      dateMode: "不选择日期",
      startDate: "2026-06-09",
      endDate: "2026-07-09",
      keyword: "  胶纸 ",
      onlyThreeDays: false,
    })).toEqual({
      物料类别: AUXILIARY_PURCHASE_PROGRESS_CATEGORY,
      keyword: "胶纸",
      onlyOwed: true,
      起: undefined,
      止: undefined,
      日期类型: undefined,
    });
  });

  it("只显示 3 天内交货期时按交货日期生成日期范围", () => {
    expect(buildAuxiliaryPurchaseProgressQuery({
      arrivalStatus: "全部",
      dateMode: "不选择日期",
      startDate: "2026-06-09",
      endDate: "2026-07-09",
      keyword: "",
      onlyThreeDays: true,
      today: "2026-07-09",
    })).toMatchObject({
      物料类别: "辅料资料",
      起: "2026-07-09",
      止: "2026-07-12",
      日期类型: "交货日期",
      onlyOwed: undefined,
    });
  });

  it("把通用采购进度行转换为辅料采购进度字段", () => {
    const row = normalizeAuxiliaryPurchaseProgressRow({
      订购日期: "2026-07-01T00:00:00",
      交货日期: "2026-07-08T00:00:00",
      采购单号: "PO20260709001",
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      物料编号: "MUGB-001",
      物料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      订购数量: 12,
      入仓数量: 4,
      欠数: 8,
      操作员: "admin",
      备注: "急",
    });

    expect(row).toMatchObject({
      订购日期: "2026-07-01",
      交货日期: "2026-07-08",
      订单单号: "PO20260709001",
      供应商编号: "0076",
      辅料编号: "MUGB-001",
      辅料名称: "透明胶纸",
      单价类型: "人民币",
      订货数量: 12,
      入仓数量: 4,
      相差数量: 8,
      备注: "急",
    });
    expect(getAuxiliaryProgressTextColor(row)).toBe("#d000d0");
    expect(getAuxiliaryProgressTextColor({ ...row, 相差数量: 0 })).toBe("#111111");
  });
});
