import { describe, expect, it } from "vitest";
import { lineAmount, productionLinePatch, sumAmount, sumQty, validLines } from "../utils/materialLines";
import { buildCopyInitial } from "../utils/materialDocCopy";
import type { DocFieldCfg } from "../pages/materials/materialDocConfigs";
import type { MaterialDocDetail } from "../api/materialDocs";

describe("物料明细合计", () => {
  it("lineAmount = 数量×单价(单价空记0)", () => {
    expect(lineAmount({ 数量: 100, 单价: 10 })).toBe(1000);
    expect(lineAmount({ 数量: 5 })).toBe(0);
  });
  it("sumQty / sumAmount", () => {
    const lines = [{ 数量: 100, 单价: 10 }, { 数量: 200, 单价: 0.5 }];
    expect(sumQty(lines)).toBe(300);
    expect(sumAmount(lines)).toBe(1100);
  });
  it("validLines 过滤无物料编号或数量<=0 的行", () => {
    const lines = [
      { 物料编号: "M1", 数量: 1 }, { 物料编号: "", 数量: 5 }, { 物料编号: "M2", 数量: 0 },
    ];
    expect(validLines(lines)).toHaveLength(1);
    expect(validLines(lines)[0].物料编号).toBe("M1");
  });
});

describe("款号选生产制单回填", () => {
  it("productionLinePatch 仅带出生产单号+款号（忽略行内其它字段）", () => {
    const row = { 生产单号: "SC20260612001", 款号: "K100", 款式: "短袖T恤", 客户名称: "某客户" };
    expect(productionLinePatch(row)).toEqual({ 生产单号: "SC20260612001", 款号: "K100" });
  });
  it("空字段回填 undefined（不会写入空串）", () => {
    expect(productionLinePatch({})).toEqual({ 生产单号: undefined, 款号: undefined });
  });
});

describe("复制单预填", () => {
  const fields: DocFieldCfg[] = [
    { name: "退料部门", label: "部门" },
    { name: "日期", label: "日期", type: "date-today" },
    { name: "退料人", label: "退料人", type: "employee" },
    { name: "单号", label: "电脑单号", type: "docno" },
    { name: "操作员", label: "操作员", type: "operator" },
    { name: "仓库", label: "仓库", required: true },
    { name: "备注", label: "备注" },
  ];
  const detail: MaterialDocDetail = {
    单头: { id: 1, 单号: "TL001", 日期: "2026-06-12", 退料部门: "裁床", 退料人: "张三",
            操作员: "admin", 仓库: "主仓", 备注: "原单备注" },
    明细: [{ id: 9, 物料编号: "M1", 物料名称: "棉布", 物料类别: "面料", 数量: 5, 单价: 10,
            生产单号: "SC1", 款号: "K1", 备注: "行注" }],
  };

  it("表头只复制可输入字段，跳过 日期/电脑单号/操作员", () => {
    const { header } = buildCopyInitial(fields, detail);
    expect(header).toEqual({ 退料部门: "裁床", 退料人: "张三", 仓库: "主仓", 备注: "原单备注" });
    expect(header).not.toHaveProperty("日期");
    expect(header).not.toHaveProperty("单号");
    expect(header).not.toHaveProperty("操作员");
  });

  it("明细整行带出含生产单号/款号，丢掉 id/金额", () => {
    const { lines } = buildCopyInitial(fields, detail);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ 物料编号: "M1", 数量: 5, 单价: 10, 生产单号: "SC1", 款号: "K1", 备注: "行注" });
    expect(lines[0]).not.toHaveProperty("id");
    expect(lines[0]).not.toHaveProperty("金额");
  });
});
