import { describe, expect, it } from "vitest";
import {
  buildAuxiliaryMonthlyQuery,
  toAuxiliaryMonthlyRow,
} from "../utils/auxiliaryMonthly";
import {
  AUXILIARY_INVENTORY_CATEGORY,
  AUXILIARY_INVENTORY_WAREHOUSE,
} from "../utils/auxiliaryInventory";

describe("辅料库存月报表查询与字段映射", () => {
  it("固定按辅料仓库和辅料资料查询月报", () => {
    expect(buildAuxiliaryMonthlyQuery({
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: "  胶纸  ",
    })).toEqual({
      仓库: AUXILIARY_INVENTORY_WAREHOUSE,
      物料类别: AUXILIARY_INVENTORY_CATEGORY,
      起: "2026-07-01",
      止: "2026-07-31",
      keyword: "胶纸",
    });
  });

  it("把物料月报行转换成辅料库存月报表列", () => {
    expect(toAuxiliaryMonthlyRow({
      物料编号: "FL-001",
      物料名称: "透明胶纸",
      规格: "2.5*90Y",
      每单位数值: "366",
      单位: "卷",
      期初库存: 10,
      本期入库: 7,
      本期出库: 8,
      盘点盈亏: -2,
      期末库存: 7,
    })).toEqual({
      辅料编号: "FL-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      每单位数值: "366",
      单位: "卷",
      期初库存: 10,
      本期入库: 7,
      本期出库: 8,
      盘点盈亏: -2,
      期末库存: 7,
    });
  });
});
