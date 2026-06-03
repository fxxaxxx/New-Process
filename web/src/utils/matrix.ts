// 色×码数量矩阵 ↔ 明细行 转换（订单/生产制单共用）
export interface QtyLine { 颜色: string; 尺码: string; 数量: number }
export type QtyMap = Record<string, number>;

export const cellKey = (颜色: string, 尺码: string) => `${颜色}|${尺码}`;

// 矩阵 → 明细行（只导出数量>0的格子，按 颜色 外层、尺码 内层 顺序）
export function matrixToLines(颜色s: string[], 尺码s: string[], qty: QtyMap): QtyLine[] {
  const lines: QtyLine[] = [];
  for (const c of 颜色s)
    for (const s of 尺码s) {
      const n = qty[cellKey(c, s)] ?? 0;
      if (n > 0) lines.push({ 颜色: c, 尺码: s, 数量: n });
    }
  return lines;
}

// 明细行 → 矩阵（详情回显）
export function linesToMatrix(lines: { 颜色?: string | null; 尺码?: string | null; 数量?: number | null }[]): QtyMap {
  const qty: QtyMap = {};
  for (const l of lines)
    if (l.颜色 && l.尺码) qty[cellKey(l.颜色, l.尺码)] = Number(l.数量 ?? 0);
  return qty;
}

export const sumMatrix = (qty: QtyMap) => Object.values(qty).reduce((a, n) => a + n, 0);
