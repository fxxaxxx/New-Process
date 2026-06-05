export const sumQty = (lines: { 数量?: number }[]) =>
  lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

// 提交前过滤：数量>0
export const validLines = <T extends { 数量?: number }>(lines: T[]) =>
  lines.filter(l => Number(l.数量 ?? 0) > 0);
