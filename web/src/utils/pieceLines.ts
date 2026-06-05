export interface PieceLine { 工序号?: string; 员工号?: string; 数量?: number; 颜色?: string; 尺码?: string; 扎号?: number }

export const sumPieceQty = (lines: { 数量?: number }[]) =>
  lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

// 提交前过滤：工序号/员工号 必填且数量>0
export const validPieceLines = (lines: PieceLine[]) =>
  lines.filter(l => !!l.工序号 && !!l.员工号 && Number(l.数量 ?? 0) > 0);
