import { describe, expect, it } from "vitest";
import {
  buildAuxiliaryStockReturnQuery,
  normalizeAuxiliaryStockReturnDetailRow,
  normalizeAuxiliaryStockReturnSummaryRow,
} from "../utils/auxiliaryStockReturnQuery";

describe("辅料退仓查询", () => {
  it("生成按啤机生产单号汇总的查询参数", () => {
    expect(buildAuxiliaryStockReturnQuery({
      dateMode: "日期",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      keyword: "  胶纸 ",
      category: "<所有类别>",
      auditStatus: "全部",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      日期类型: "日期",
      keyword: "胶纸",
      物料类别: undefined,
      审核情况: undefined,
    });
  });

  it("明细查询可传审核情况，不选择日期时不传日期范围", () => {
    expect(buildAuxiliaryStockReturnQuery({
      dateMode: "不选择日期",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      keyword: "",
      category: "辅料资料",
      auditStatus: "未审核",
    })).toEqual({
      起: undefined,
      止: undefined,
      日期类型: undefined,
      keyword: undefined,
      物料类别: "辅料资料",
      审核情况: "未审核",
    });
  });

  it("把接口行转换为截图中的汇总和明细字段", () => {
    expect(normalizeAuxiliaryStockReturnSummaryRow({
      装配生产单号: "MA_RR_1418",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      退料数量: 12,
    })).toMatchObject({
      装配生产单号: "MA_RR_1418",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      退料数量: 12,
    });

    expect(normalizeAuxiliaryStockReturnDetailRow({
      装配生产单号: "MA_RR_1418",
      日期: "2026-07-02T00:00:00",
      单号: "TL260702001",
      退料部门: "装配部",
      退料人: "王军",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      数量: 8,
      备注: "测试备注",
      审核: "1",
    })).toMatchObject({
      装配生产单号: "MA_RR_1418",
      日期: "2026-07-02",
      单号: "TL260702001",
      退料部门: "装配部",
      退料人: "王军",
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
