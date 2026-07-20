import { describe, expect, it } from "vitest";
import {
  applyAuxiliaryIssueMaterialToLine,
  applyAuxiliaryStocktakeMaterialToLine,
  buildAuxiliaryIssuePayload,
  buildAuxiliaryReturnPayload,
  buildAuxiliaryStocktakePayload,
  compactAuxiliaryIssueLines,
  createAuxiliaryIssueLines,
  createAuxiliaryStocktakeLines,
  summarizeAuxiliaryIssueLines,
  summarizeAuxiliaryStocktakeLines,
} from "../utils/auxiliaryIssue";

describe("辅料出库单明细选择与保存载荷", () => {
  it("点击辅料名称后回填辅料资料字段", () => {
    const [line] = createAuxiliaryIssueLines(1);

    expect(applyAuxiliaryIssueMaterialToLine(line, {
      ID: 9,
      物料类别: "辅料资料",
      物料编号: "FL-001",
      物料名称: "透明胶纸",
      规格: "2.5*90Y",
      单位: "卷",
      单价: 1.2,
      码换算: "366",
      备注: "常用",
    })).toMatchObject({
      辅料编号: "FL-001",
      辅料名称: "透明胶纸",
      规格: "2.5*90Y",
      每单位数值: "366",
      单位: "卷",
      数量: 0,
      单价: 1.2,
      备注: "",
    });
  });

  it("保存时固定写辅料仓库、辅料资料和装配生产单号", () => {
    const lines = createAuxiliaryIssueLines(3);
    const payload = buildAuxiliaryIssuePayload({
      department: "生产车间",
      issuePerson: "张三",
      date: "2026-07-09",
      note: "",
      issueRemark: "生产领料",
      lines: [
        { ...lines[0], 装配生产单号: "MA_RR_1418", 辅料编号: "A001", 辅料名称: "胶纸", 单位: "卷", 数量: 3, 单价: 2, 备注: "急用" },
        { ...lines[1], 辅料编号: "A002", 辅料名称: "贴纸", 数量: 0 },
        { ...lines[2], 辅料名称: "无编号", 数量: 5 },
      ],
    });

    expect(payload).toMatchObject({
      领料部门: "生产车间",
      领料人: "张三",
      日期: "2026-07-09",
      仓库: "辅料仓库",
      备注: "生产领料",
    });
    expect(payload.明细).toEqual([
      {
        物料编号: "A001",
        物料名称: "胶纸",
        物料类别: "辅料资料",
        规格: undefined,
        颜色: undefined,
        单位: "卷",
        数量: 3,
        单价: 2,
        金额: 6,
        备注: "急用",
        生产单号: "MA_RR_1418",
      },
    ]);
  });

  it("底部合计和删除空白行只保留有效辅料", () => {
    const lines = [
      { key: 1, 序号: 1, 辅料编号: "A", 辅料名称: "胶纸", 数量: 2, 单价: 3 },
      { key: 2, 序号: 2, 辅料编号: "B", 辅料名称: "贴纸", 数量: 4, 单价: 1.25 },
      { key: 3, 序号: 3, 数量: undefined, 单价: 99 },
    ];

    expect(summarizeAuxiliaryIssueLines(lines)).toEqual({ 数量: 6, 金额: 11 });
    expect(compactAuxiliaryIssueLines(lines).map(line => line.序号)).toEqual([1, 2]);
  });
});

describe("辅料退库表明细选择与保存载荷", () => {
  it("保存时固定写辅料仓库、辅料资料和退料字段", () => {
    const [line] = createAuxiliaryIssueLines(1);

    const payload = buildAuxiliaryReturnPayload({
      department: "包装部",
      returnPerson: "李四",
      date: "2026-07-09",
      note: "退回余料",
      lines: [
        { ...line, 装配生产单号: "MA_RR_2001", 辅料编号: "FL-009", 辅料名称: "贴纸", 规格: "5*7", 单位: "PCS", 数量: 12 },
      ],
    });

    expect(payload).toMatchObject({
      退料部门: "包装部",
      退料人: "李四",
      日期: "2026-07-09",
      仓库: "辅料仓库",
      备注: "退回余料",
    });
    expect(payload.明细).toEqual([
      {
        物料编号: "FL-009",
        物料名称: "贴纸",
        物料类别: "辅料资料",
        规格: "5*7",
        颜色: undefined,
        单位: "PCS",
        数量: 12,
        单价: undefined,
        金额: undefined,
        备注: undefined,
        生产单号: "MA_RR_2001",
      },
    ]);
  });
});

describe("辅料盘点单明细选择与保存载荷", () => {
  it("点击辅料名称后回填辅料资料字段并保留盘点数量", () => {
    const [line] = createAuxiliaryStocktakeLines(1);

    expect(applyAuxiliaryStocktakeMaterialToLine({ ...line, 系统数量: 10, 盘点数量: 8 }, {
      ID: 10,
      物料类别: "辅料资料",
      物料编号: "FL-010",
      物料名称: "圆形贴纸",
      规格: "直径30MM",
      单位: "PCS",
      码换算: "1",
    })).toMatchObject({
      辅料编号: "FL-010",
      辅料名称: "圆形贴纸",
      规格: "直径30MM",
      单位: "PCS",
      系统数量: 10,
      盘点数量: 8,
      盈亏数量: -2,
    });
  });

  it("保存时固定写辅料仓库并只提交有效辅料盘点行", () => {
    const lines = createAuxiliaryStocktakeLines(3);

    const payload = buildAuxiliaryStocktakePayload({
      date: "2026-07-09",
      note: "月末盘点",
      lines: [
        { ...lines[0], 辅料编号: "FL-001", 辅料名称: "胶纸", 规格: "2.5*90Y", 单位: "卷", 系统数量: 10, 盘点数量: 8 },
        { ...lines[1], 辅料编号: "FL-002", 辅料名称: "贴纸", 单位: "PCS", 系统数量: 5, 盘点数量: 5 },
        { ...lines[2], 辅料名称: "无编号", 系统数量: 1, 盘点数量: 0 },
      ],
    });

    expect(payload).toEqual({
      日期: "2026-07-09",
      仓库: "辅料仓库",
      备注: "月末盘点",
      明细: [
        { 物料编号: "FL-001", 物料名称: "胶纸", 规格: "2.5*90Y", 单位: "卷", 系统数量: 10, 盘点数量: 8 },
        { 物料编号: "FL-002", 物料名称: "贴纸", 规格: undefined, 单位: "PCS", 系统数量: 5, 盘点数量: 5 },
      ],
    });
    expect(summarizeAuxiliaryStocktakeLines(payload.明细.map((line, index) => ({
      key: index + 1,
      序号: index + 1,
      辅料编号: line.物料编号,
      辅料名称: line.物料名称,
      规格: line.规格,
      单位: line.单位,
      系统数量: line.系统数量,
      盘点数量: line.盘点数量,
    })))).toEqual({ 系统数量: 15, 盘点数量: 13, 盈亏数量: -2 });
  });
});
