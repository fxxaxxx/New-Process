import type { SemiFinishedLabelProductRow } from "../api/semiFinishedLabelOrders";

export interface LabelLine {
  ID?: number;
  配件编号: string;
  客户?: string | null;
  产品货号: string;
  产品名称?: string | null;
  产品装配名称?: string | null;
  数量: number;
  每箱数量?: number | null;
  预计标签数: number;
  实需标签数: number;
  实需标签数已手改?: boolean;
  备注?: string | null;
}

export type ProductRow = SemiFinishedLabelProductRow;
export interface QuantityPatch { 数量?: number; 每箱数量?: number | null }
export interface EditableLabelOrder { 明细: LabelLine[] }
export interface ValidationIssue { 字段: string; 消息: string }
export interface PrintableLabel extends LabelLine {
  序号: number;
  总标签数: number;
}

export function calculateExpectedLabels(quantity: number, perBox?: number | null): number {
  if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(perBox) || (perBox as number) <= 0) return 0;
  return Math.ceil(quantity / (perBox as number));
}

export function recalculateLine(line: LabelLine, patch: QuantityPatch): LabelLine {
  const next = { ...line, ...patch };
  const expected = calculateExpectedLabels(next.数量, next.每箱数量);
  return {
    ...next,
    预计标签数: expected,
    实需标签数: next.实需标签数已手改 ? next.实需标签数 : expected,
  };
}

export function markActualLabelsEdited(line: LabelLine, actual: number): LabelLine {
  return { ...line, 实需标签数: actual, 实需标签数已手改: true };
}

function productToLine(product: ProductRow): LabelLine {
  const quantity = product.数量 ?? 0;
  const expected = calculateExpectedLabels(quantity, product.每箱数量);
  return {
    配件编号: product.配件编号.trim(),
    客户: product.客户,
    产品货号: product.产品货号,
    产品名称: product.产品名称,
    产品装配名称: product.产品装配名称,
    数量: quantity,
    每箱数量: product.每箱数量,
    预计标签数: expected,
    实需标签数: expected,
    实需标签数已手改: false,
  };
}

export function mergeSelectedProducts(lines: LabelLine[], products: ProductRow[]): LabelLine[] {
  const merged = new Map<string, LabelLine>();
  const add = (source: LabelLine) => {
    const displayValue = source.配件编号.trim();
    const key = displayValue.toLocaleLowerCase();
    const current = merged.get(key);
    if (!current) {
      merged.set(key, { ...source, 配件编号: displayValue });
      return;
    }
    const nextQuantity = current.数量 + source.数量;
    const next = { ...current, 数量: nextQuantity };
    merged.set(key, recalculateLine(next, { 数量: nextQuantity }));
  };
  lines.forEach(add);
  products.map(productToLine).forEach(add);
  return [...merged.values()];
}

function validateLabelOrderInternal(
  order: EditableLabelOrder,
  requirePerBox: boolean,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!order.明细.length) issues.push({ 字段: "明细", 消息: "至少需要一条明细" });
  order.明细.forEach((line, index) => {
    const field = (name: string) => `明细[${index}].${name}`;
    if (!line.配件编号.trim()) issues.push({ 字段: field("配件编号"), 消息: "配件编号不能为空" });
    if (!line.产品货号.trim()) issues.push({ 字段: field("产品货号"), 消息: "产品货号不能为空" });
    const quantityValid = Number.isFinite(line.数量) && line.数量 >= 0;
    const perBoxEmpty = line.每箱数量 == null;
    const perBoxPositive = Number.isFinite(line.每箱数量) && (line.每箱数量 as number) > 0;
    const perBoxValid = perBoxPositive || (!requirePerBox && perBoxEmpty);
    const expectedValid = Number.isInteger(line.预计标签数) && line.预计标签数 >= 0;
    if (!quantityValid) issues.push({ 字段: field("数量"), 消息: "数量必须为有限的非负数" });
    if (!perBoxValid) {
      issues.push({
        字段: field("每箱数量"),
        消息: requirePerBox ? "打印前每箱数量必须大于 0" : "每箱数量必须为空或大于 0",
      });
    }
    const expected = perBoxPositive ? calculateExpectedLabels(line.数量, line.每箱数量) : 0;
    if (!expectedValid || (quantityValid && perBoxValid && line.预计标签数 !== expected)) {
      issues.push({ 字段: field("预计标签数"), 消息: "预计标签数必须为按数量计算的非负整数" });
    }
    if (!Number.isFinite(line.实需标签数) || !Number.isInteger(line.实需标签数) || line.实需标签数 < 0) {
      issues.push({ 字段: field("实需标签数"), 消息: "实际标签数必须为有限的非负整数" });
    }
  });
  return issues;
}

export function validateLabelOrder(order: EditableLabelOrder): ValidationIssue[] {
  return validateLabelOrderInternal(order, false);
}

export function validateLabelOrderForPrint(order: EditableLabelOrder): ValidationIssue[] {
  return validateLabelOrderInternal(order, true);
}

export function expandPrintableLabels(lines: LabelLine[]): PrintableLabel[] {
  const labels: PrintableLabel[] = [];
  let sequence = 0;
  for (const line of lines) {
    if (!Number.isInteger(line.实需标签数) || line.实需标签数 <= 0) continue;
    for (let index = 0; index < line.实需标签数; index += 1) {
      labels.push({ ...line, 序号: ++sequence, 总标签数: line.实需标签数 });
    }
  }
  return labels;
}
