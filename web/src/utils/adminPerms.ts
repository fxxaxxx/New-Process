export const PERM_BITS = ["打开", "保存", "删除", "打印", "单价", "金额", "审核", "反审核", "功能"] as const;

export function groupByCategory<T extends { 组?: string; 菜单: string }>(
  rows: T[],
): { 组: string; 菜单行: T[] }[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const 组 = r.组 ?? "";
    if (!map.has(组)) { map.set(组, []); order.push(组); }
    map.get(组)!.push(r);
  }
  return order.map((组) => ({ 组, 菜单行: map.get(组)! }));
}
