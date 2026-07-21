export interface STKDraftLine {
  key: number;
  配件编号: string;
  客户?: string | null;
  产品货号?: string | null;
  产品名称?: string | null;
  产品装配名称?: string | null;
  系统数量: number;
  盘点数量: number;
  备注?: string | null;
}

interface PickedProduct {
  配件编号: string;
  客户?: string | null;
  产品货号?: string | null;
  产品名称?: string | null;
  产品装配名称?: string | null;
}

// 选产品去重合并；新行的 系统数量 由 sysQty(配件编号) 查库存带出，盘点数量默认等于系统数量。
export function mergeSemiStocktakeLines(
  existing: STKDraftLine[],
  picked: PickedProduct[],
  sysQty: (配件编号: string) => number,
): STKDraftLine[] {
  const seen = new Map(existing.map(l => [l.配件编号.trim(), l]));
  let key = existing.reduce((m, l) => Math.max(m, l.key), 0);
  for (const p of picked) {
    const code = p.配件编号?.trim();
    if (!code || seen.has(code)) continue;
    const sys = sysQty(code);
    const row: STKDraftLine = {
      key: ++key, 配件编号: code, 客户: p.客户 ?? null, 产品货号: p.产品货号 ?? null,
      产品名称: p.产品名称 ?? null, 产品装配名称: p.产品装配名称 ?? null,
      系统数量: sys, 盘点数量: sys, 备注: "",
    };
    seen.set(code, row);
  }
  return [...seen.values()];
}

export function validateSemiStocktake(input: { 明细: STKDraftLine[] }): string | null {
  const valid = input.明细.filter(l => l.配件编号.trim());
  if (valid.length === 0) return "请至少录入一行盘点产品。";
  for (const l of valid) if (Number(l.盘点数量) < 0) return "盘点数量不能为负。";
  const seen = new Set<string>();
  for (const l of valid) {
    const code = l.配件编号.trim();
    if (seen.has(code)) return `配件编号 ${code} 在同一单据中重复。`;
    seen.add(code);
  }
  return null;
}
