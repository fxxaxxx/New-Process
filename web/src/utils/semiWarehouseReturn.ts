export interface SWRDraftLine {
  key: number;
  配件编号: string;
  客户?: string | null;
  产品货号?: string | null;
  产品名称?: string | null;
  产品装配名称?: string | null;
  生产单号?: string | null;
  数量: number;
  单价?: number | null;
  备注?: string | null;
}

interface PickedProduct {
  配件编号: string;
  客户?: string | null;
  产品货号?: string | null;
  产品名称?: string | null;
  产品装配名称?: string | null;
  生产单号?: string | null;
  库存单价?: number | null;
}

export function mergeSemiWarehouseReturnLines(existing: SWRDraftLine[], picked: PickedProduct[]): SWRDraftLine[] {
  const seen = new Map(existing.map(l => [l.配件编号.trim(), l]));
  let key = existing.reduce((m, l) => Math.max(m, l.key), 0);
  for (const p of picked) {
    const code = p.配件编号?.trim();
    if (!code || seen.has(code)) continue;
    const row: SWRDraftLine = {
      key: ++key, 配件编号: code, 客户: p.客户 ?? null, 产品货号: p.产品货号 ?? null,
      产品名称: p.产品名称 ?? null, 产品装配名称: p.产品装配名称 ?? null,
      生产单号: p.生产单号 ?? null, 数量: 0, 单价: p.库存单价 ?? null, 备注: "",
    };
    seen.set(code, row);
  }
  return [...seen.values()];
}

export function validateSemiWarehouseReturn(input: { 入仓单号?: string; 明细: SWRDraftLine[] }): string | null {
  if (!input.入仓单号?.trim()) return "请先选择原入仓单号。";
  const valid = input.明细.filter(l => l.配件编号.trim());
  if (valid.length === 0) return "请至少录入一行退仓产品。";
  for (const l of valid) if (Number(l.数量) <= 0) return "退仓数量必须大于 0。";
  const seen = new Set<string>();
  for (const l of valid) {
    const code = l.配件编号.trim();
    if (seen.has(code)) return `配件编号 ${code} 在同一单据中重复。`;
    seen.add(code);
  }
  return null;
}
