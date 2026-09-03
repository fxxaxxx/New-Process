// 物料单据明细行（采购入仓/领料/退料 共用）
export interface DocLine {
  物料编号?: string; 物料名称?: string; 物料类别?: string;
  规格?: string; 颜色?: string; 单位?: string;
  数量?: number; 单价?: number | null; 金额?: number | null;
  订单单号?: string; 生产单号?: string; 款号?: string; 备注?: string;
  // 显示用(不提交):选采购订单行时带出的订单口径,供「收后欠数」列实时算状态
  订购数量?: number; 订单欠数?: number;
}

export const lineAmount = (l: { 数量?: number; 单价?: number | null }) =>
  Number(l.数量 ?? 0) * Number(l.单价 ?? 0);

export const sumQty = (lines: { 数量?: number }[]) =>
  lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

export const sumAmount = (lines: { 数量?: number; 单价?: number | null }[]) =>
  lines.reduce((a, l) => a + lineAmount(l), 0);

// 提交前过滤：必须有物料编号且数量>0
export const validLines = (lines: DocLine[]) =>
  lines.filter(l => !!l.物料编号 && Number(l.数量 ?? 0) > 0);

// 款号/生产单号 点击选生产制单后的回填补丁（仅带出生产单号与款号）
export const productionLinePatch = (row: { 生产单号?: string; 款号?: string }): Partial<DocLine> => ({
  生产单号: row.生产单号 || undefined,
  款号: row.款号 || undefined,
});
