export interface SemiReceiptEditableLine {
  key: number;
  订单单号?: string;
  配件编号: string;
  客户?: string | null;
  产品货号: string;
  产品名称?: string | null;
  产品装配名称?: string | null;
  生产单号?: string;
  单位?: string;
  数量: number;
  单价?: number | null;
  备注?: string;
}

type Product = Omit<SemiReceiptEditableLine, "key" | "数量"> & { 数量?: number | null };

export function mergeSemiReceiptProducts(current: SemiReceiptEditableLine[], selected: Product[]) {
  const result = [...current];
  const known = new Set(result.map(line => `${line.配件编号}|${line.产品货号}`));
  for (const product of selected) {
    const identity = `${product.配件编号}|${product.产品货号}`;
    if (known.has(identity)) continue;
    known.add(identity);
    result.push({ ...product, key: result.length + 1, 数量: 0 });
  }
  return result.map((line, index) => ({ ...line, key: index + 1 }));
}

export function summarizeSemiReceiptLines(lines: SemiReceiptEditableLine[]) {
  const groups = new Map<string, { key: string; 配件编号: string; 产品装配名称: string; 入仓数量: number }>();
  for (const line of lines) {
    if (!line.配件编号 || line.数量 <= 0) continue;
    const name = line.产品装配名称 ?? "";
    const key = `${line.配件编号}|${name}`;
    const current = groups.get(key);
    if (current) current.入仓数量 += line.数量;
    else groups.set(key, { key, 配件编号: line.配件编号, 产品装配名称: name, 入仓数量: line.数量 });
  }
  return [...groups.values()].map((row, index) => ({ ...row, 序号: index + 1 }));
}

export function validateSemiReceipt(value: { 供应商名称?: string; 仓库?: string; 明细: SemiReceiptEditableLine[] }) {
  if (!value.供应商名称?.trim()) return "请选择供应商";
  if (!value.仓库?.trim()) return "请选择收货仓库";
  if (!value.明细.some(line => line.配件编号.trim() && line.产品货号.trim() && line.数量 > 0)) {
    return "请至少录入一行数量大于 0 的明细";
  }
  return null;
}
