import { describe, expect, it } from "vitest";
import {
  AUXILIARY_ISSUE_PROGRESS_CATEGORY,
  buildAuxiliaryIssueProgressQuery,
  getAuxiliaryIssueProgressTextColor,
  normalizeAuxiliaryIssueProgressRow,
} from "../utils/auxiliaryIssueProgress";

describe("辅料出库进度表查询与字段映射", () => {
  it("默认只查辅料资料，并按未领出生成欠数查询", () => {
    expect(buildAuxiliaryIssueProgressQuery({
      arrivalStatus: "未到",
      dateMode: "不选择日期",
      startDate: "2026-06-09",
      endDate: "2026-07-09",
      keyword: "  MA_RR_1418 ",
      issueRemark: "全部",
    })).toEqual({
      物料类别: AUXILIARY_ISSUE_PROGRESS_CATEGORY,
      到货情况: "未到",
      日期类型: undefined,
      起: undefined,
      止: undefined,
      keyword: "MA_RR_1418",
      领料备注: undefined,
    });
  });

  it("启用日期和领料备注时保留筛选条件", () => {
    expect(buildAuxiliaryIssueProgressQuery({
      arrivalStatus: "全部",
      dateMode: "开单日期",
      startDate: "2026-06-09",
      endDate: "2026-07-09",
      keyword: "",
      issueRemark: "生产领料",
    })).toMatchObject({
      物料类别: "辅料资料",
      到货情况: undefined,
      日期类型: "开单日期",
      起: "2026-06-09",
      止: "2026-07-09",
      keyword: undefined,
      领料备注: "生产领料",
    });
  });

  it("把后端进度行转换为截图字段，并按未领数量染色", () => {
    const row = normalizeAuxiliaryIssueProgressRow({
      开单日期: "2026-07-01T00:00:00",
      装配生产单号: "MA_RR_1418",
      领料备注: "生产领料",
      辅料编号: "08021020",
      辅料名称: "15788B 彩盒B（5L版）",
      规格: "89*63MM",
      单位: "PCS",
      需求数量: 334,
      已领数量: 120,
      未领数量: 214,
      操作员: "admin",
    });

    expect(row).toMatchObject({
      开单日期: "2026-07-01",
      装配生产单号: "MA_RR_1418",
      领料备注: "生产领料",
      辅料编号: "08021020",
      辅料名称: "15788B 彩盒B（5L版）",
      规格: "89*63MM",
      单位: "PCS",
      需求数量: 334,
      已领数量: 120,
      未领数量: 214,
      操作员: "admin",
    });
    expect(getAuxiliaryIssueProgressTextColor(row)).toBe("#d000d0");
    expect(getAuxiliaryIssueProgressTextColor({ ...row, 未领数量: 0 })).toBe("#111111");
  });
});
