// 前单/后单：在单号升序序列中取当前单的相邻单号。
// 口径与后端 adjacent 端点一致（见 SemiReceiptService.GetAdjacentAsync）：
// 前单 = 更早录入的单（较小单号），后单 = 更晚录入的单（较大单号）。
// 列表由调用方用各 controller 已有的 list 端点拉取，无需新增后端接口。
export function adjacentDocNo(
  nos: (string | null | undefined)[],
  current: string,
  next: boolean,
): string | undefined {
  const sorted = [...new Set(nos.filter((x): x is string => !!x))]
    .sort((a, b) => a.localeCompare(b, "zh-Hans-CN", { numeric: true }));
  const index = sorted.indexOf(current);
  if (index < 0) return undefined;
  return sorted[index + (next ? 1 : -1)];
}
