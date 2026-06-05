export interface OutLine { 加工项目?: string; 数量?: number; 颜色?: string; 尺码?: string; 色号?: string }

export const sumQty = (lines: { 数量?: number }[]) =>
  lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

// 提交前过滤：加工项目必填且数量>0
export const validOutsourceLines = (lines: OutLine[]) =>
  lines.filter(l => !!l.加工项目 && Number(l.数量 ?? 0) > 0);
