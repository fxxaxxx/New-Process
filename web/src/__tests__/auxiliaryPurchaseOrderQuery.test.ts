import { describe, expect, it } from "vitest";
import {
  buildAuxiliaryPurchaseOrderQuery,
  normalizeAuxiliaryPurchaseOrderDetailRow,
  normalizeAuxiliaryPurchaseOrderSummaryRow,
} from "../utils/auxiliaryPurchaseOrderQuery";

describe("辅料采购订单查询", () => {
  it("按订货日期生成汇总查询参数，并支持按供应商汇总", () => {
    expect(buildAuxiliaryPurchaseOrderQuery({
      dateMode: "订货日期",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      keyword: "  胶纸 ",
      category: "<所有类别>",
      groupBySupplier: true,
      auditStatus: "全部",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      日期类型: "订货日期",
      keyword: "胶纸",
      物料类别: undefined,
      按供应商: true,
      审核情况: undefined,
    });
  });

  it("不选择日期时不传日期范围，明细可传审核情况", () => {
    expect(buildAuxiliaryPurchaseOrderQuery({
      dateMode: "不选择日期",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      keyword: "",
      category: "辅料资料",
      groupBySupplier: false,
      auditStatus: "已审核",
    })).toEqual({
      起: undefined,
      止: undefined,
      日期类型: undefined,
      keyword: undefined,
      物料类别: "辅料资料",
      按供应商: false,
      审核情况: "已审核",
    });
  });

  it("把接口行转换为截图中的汇总和明细字段", () => {
    expect(normalizeAuxiliaryPurchaseOrderSummaryRow({
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      订货数量: 12,
    })).toMatchObject({
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      订货数量: 12,
    });

    expect(normalizeAuxiliaryPurchaseOrderDetailRow({
      日期: "2026-07-01T00:00:00",
      单号: "CG26070101",
      交货日期: "2026-07-31T00:00:00",
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      数量: 8,
      备注: "测试备注",
      审核: "1",
    })).toMatchObject({
      日期: "2026-07-01",
      单号: "CG26070101",
      交货日期: "2026-07-31",
      供应商编号: "0076",
      供应商名称: "东莞市沃轩实业有限公司",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      数量: 8,
      备注: "测试备注",
      审核: "1",
    });
  });
});
