import { describe, expect, it } from "vitest";
import {
  buildAuxiliaryIssueDetailQuery,
  getAuxiliaryIssueDetailTextColor,
  normalizeAuxiliaryIssueDetailRow,
} from "../utils/auxiliaryIssueDetail";

describe("辅料出库明细表查询与字段映射", () => {
  it("默认按未到生成查询，且不选择日期时不传日期范围", () => {
    expect(buildAuxiliaryIssueDetailQuery({
      arrivalStatus: "未到",
      dateMode: "不选择日期",
      startDate: "2026-06-10",
      endDate: "2026-07-10",
      keyword: "  MA_RR ",
      issueRemark: "全部",
    })).toEqual({
      到货情况: "未到",
      keyword: "MA_RR",
      起: undefined,
      止: undefined,
      日期类型: undefined,
      领料备注: undefined,
    });
  });

  it("选择日期和领料备注时传递对应条件", () => {
    expect(buildAuxiliaryIssueDetailQuery({
      arrivalStatus: "全部",
      dateMode: "领料日期",
      startDate: "2026-06-10",
      endDate: "2026-07-10",
      keyword: "",
      issueRemark: "生产领料",
    })).toEqual({
      到货情况: undefined,
      keyword: undefined,
      起: "2026-06-10",
      止: "2026-07-10",
      日期类型: "领料日期",
      领料备注: "生产领料",
    });
  });

  it("把接口行转换为截图中的辅料出库明细字段", () => {
    const row = normalizeAuxiliaryIssueDetailRow({
      开单日期: "2026-07-01T00:00:00",
      装配生产单号: "MA_RR_1418",
      领料备注: "生产领料",
      辅料编号: "AID-A1",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      需求数量: 10,
      领料日期: "2026-07-03T00:00:00",
      领料单号: "LL20260703001",
      领料数量: 3,
      合计已领数量: 5,
      未领数量: 5,
    });

    expect(row).toMatchObject({
      开单日期: "2026-07-01",
      装配生产单号: "MA_RR_1418",
      领料备注: "生产领料",
      辅料编号: "AID-A1",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      需求数量: 10,
      领料日期: "2026-07-03",
      领料单号: "LL20260703001",
      领料数量: 3,
      合计已领数量: 5,
      未领数量: 5,
    });
    expect(getAuxiliaryIssueDetailTextColor(row)).toBe("#d000d0");
    expect(getAuxiliaryIssueDetailTextColor({ ...row, 未领数量: 0 })).toBe("#111111");
  });
});
