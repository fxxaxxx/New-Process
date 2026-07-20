import { describe, expect, it } from "vitest";
import {
  buildAuxiliaryProgressDetailQuery,
  getAuxiliaryProgressDetailTextColor,
  normalizeAuxiliaryProgressDetailRow,
} from "../utils/auxiliaryProgressDetail";

describe("辅料进度明细表查询与字段映射", () => {
  it("默认按未到货生成辅料资料查询，且不选择日期时不传日期范围", () => {
    expect(buildAuxiliaryProgressDetailQuery({
      arrivalStatus: "未到",
      dateMode: "不选择日期",
      startDate: "2026-06-10",
      endDate: "2026-07-10",
      keyword: "  胶纸 ",
    })).toEqual({
      到货情况: "未到",
      keyword: "胶纸",
      起: undefined,
      止: undefined,
      日期类型: undefined,
    });
  });

  it("选择订购日期时传递日期范围", () => {
    expect(buildAuxiliaryProgressDetailQuery({
      arrivalStatus: "全部",
      dateMode: "订购日期",
      startDate: "2026-06-10",
      endDate: "2026-07-10",
      keyword: "",
    })).toEqual({
      到货情况: "全部",
      keyword: undefined,
      起: "2026-06-10",
      止: "2026-07-10",
      日期类型: "订购日期",
    });
  });

  it("把接口行转换为截图中的辅料进度明细字段", () => {
    const row = normalizeAuxiliaryProgressDetailRow({
      订购日期: "2026-07-01T00:00:00",
      交货日期: "2026-07-08T00:00:00",
      订购单号: "PO20260709001",
      供应商名称: "东莞市沃轩实业有限公司",
      辅料编号: "MUGB-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      单价类型: "人民币",
      订货数量: 12,
      入仓日期: "2026-07-05T00:00:00",
      入仓单号: "PIN20260705001",
      入仓数量: 4,
      总入仓数: 4,
      相差数量: 8,
    });

    expect(row).toMatchObject({
      订购日期: "2026-07-01",
      交货日期: "2026-07-08",
      订购单号: "PO20260709001",
      供应商名称: "东莞市沃轩实业有限公司",
      辅料编号: "MUGB-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      单价类型: "人民币",
      订货数量: 12,
      入仓日期: "2026-07-05",
      入仓单号: "PIN20260705001",
      入仓数量: 4,
      总入仓数: 4,
      相差数量: 8,
    });
    expect(getAuxiliaryProgressDetailTextColor(row)).toBe("#d000d0");
    expect(getAuxiliaryProgressDetailTextColor({ ...row, 相差数量: 0 })).toBe("#111111");
  });
});
