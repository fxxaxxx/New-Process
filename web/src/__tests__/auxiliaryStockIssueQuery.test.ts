import { describe, expect, it } from "vitest";
import {
  buildAuxiliaryStockIssueQuery,
  normalizeAuxiliaryStockIssueDetailRow,
  normalizeAuxiliaryStockIssueSummaryRow,
} from "../utils/auxiliaryStockIssueQuery";

describe("辅料出库查询", () => {
  it("生成按领料备注汇总的查询参数", () => {
    expect(buildAuxiliaryStockIssueQuery({
      dateMode: "日期",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      keyword: "  胶纸 ",
      category: "<所有类别>",
      issueRemark: "全部",
      maker: "",
      auditStatus: "全部",
    })).toEqual({
      起: "2026-07-01",
      止: "2026-07-31",
      日期类型: "日期",
      keyword: "胶纸",
      物料类别: undefined,
      领料备注: undefined,
      制单人: undefined,
      审核情况: undefined,
    });
  });

  it("明细查询可传制单人与审核情况，不选择日期时不传日期范围", () => {
    expect(buildAuxiliaryStockIssueQuery({
      dateMode: "不选择日期",
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      keyword: "",
      category: "辅料资料",
      issueRemark: "生产领料",
      maker: "何明武",
      auditStatus: "未审核",
    })).toEqual({
      起: undefined,
      止: undefined,
      日期类型: undefined,
      keyword: undefined,
      物料类别: "辅料资料",
      领料备注: "生产领料",
      制单人: "何明武",
      审核情况: "未审核",
    });
  });

  it("把接口行转换为截图中的汇总和明细字段", () => {
    expect(normalizeAuxiliaryStockIssueSummaryRow({
      领料备注: "生产领料",
      开单日期: "2026-07-01T00:00:00",
      装配生产单号: "MA_RR_1418",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      领料数量: 12,
      备注: "测试备注",
    })).toMatchObject({
      领料备注: "生产领料",
      开单日期: "2026-07-01",
      装配生产单号: "MA_RR_1418",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      领料数量: 12,
      备注: "测试备注",
    });

    expect(normalizeAuxiliaryStockIssueDetailRow({
      领料备注: "生产领料",
      开单日期: "2026-07-01T00:00:00",
      装配生产单号: "MA_RR_1418",
      日期: "2026-07-02T00:00:00",
      审核日期: "2026-07-03T00:00:00",
      单号: "LL260701001",
      生产车间: "装配部",
      领料人: "王军",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      数量: 8,
      备注: "测试备注",
      制单人: "何明武",
      审核: "1",
    })).toMatchObject({
      领料备注: "生产领料",
      开单日期: "2026-07-01",
      装配生产单号: "MA_RR_1418",
      日期: "2026-07-02",
      审核日期: "2026-07-03",
      单号: "LL260701001",
      生产车间: "装配部",
      领料人: "王军",
      辅料编号: "12000078",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      数量: 8,
      备注: "测试备注",
      制单人: "何明武",
      审核: "1",
    });
  });
});
