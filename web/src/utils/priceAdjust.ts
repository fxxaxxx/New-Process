// 调价单页面纯逻辑(可单测):明细校验 / 日期格式化 / 明细查询关键字

export interface PriceAdjustLineDraft {
  物料编号?: string | null;
  修改单价?: number | null;
}

// 明细保存前校验:返回错误消息,合法返回 null
export function validatePriceAdjustLine(line: PriceAdjustLineDraft): string | null {
  if (!line.物料编号?.trim()) return "物料编号不能为空";
  if (line.修改单价 != null && line.修改单价 < 0) return "修改单价不能为负数";
  return null;
}

// 后端日期是 ISO 串,表格只显示 YYYY-MM-DD
export function fmtDate(v: unknown): string {
  if (v == null || v === "") return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

// 明细按 单号 过滤:master 列表只有 keyword 模糊搜索,先搜再精确过滤
export function linesOfDoc<T extends { 单号?: string | null }>(lines: T[], 单号: string): T[] {
  return lines.filter(l => l.单号 === 单号);
}
