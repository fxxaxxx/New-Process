import { describe, expect, it } from "vitest";
import {
  buildAuxiliaryOrderReceiptStatsQuery,
  toAuxiliaryOrderReceiptStatsRow,
} from "../utils/auxiliaryOrderReceiptStats";

describe("辅料订货入库统计查询与字段映射", () => {
  it("整理日期、日期类型和关键词参数", () => {
    expect(buildAuxiliaryOrderReceiptStatsQuery({
      起: "2026-06-10",
      止: "2026-07-10",
      日期类型: "订购日期",
      keyword: "  胶纸  ",
    })).toEqual({
      起: "2026-06-10",
      止: "2026-07-10",
      日期类型: "订购日期",
      keyword: "胶纸",
    });
  });

  it("保留辅料报表需要展示的订货、入库和相关差异字段", () => {
    expect(toAuxiliaryOrderReceiptStatsRow({
      订购日期: "2026-07-02",
      交货日期: "2026-07-15",
      订购单号: "PO1",
      供应商名称: "辅料供应商",
      辅料编号: "FL-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      采购单价: 5,
      单价HKD: 5,
      其他成本单价HKD: 0,
      订货数量: 10,
      订货金额HKD: 50,
      入库数量: 3,
      入库订货金额HKD: 15,
      入库其他费用HKD: 0,
      入库金额合计HKD: 15,
      相关数量: 7,
      相关金额HKD: 35,
      操作员: "tester",
    })).toMatchObject({
      辅料编号: "FL-001",
      辅料名称: "透明胶纸",
      订货数量: 10,
      入库数量: 3,
      相关数量: 7,
      操作员: "tester",
    });
  });
});
