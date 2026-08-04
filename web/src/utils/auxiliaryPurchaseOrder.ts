import type { MaterialRow } from "../api/materialMaster";
import type { PurchaseOrderCreate } from "../api/purchaseOrders";

export const AUXILIARY_PURCHASE_ORDER_CATEGORY = "辅料资料";
export const AUXILIARY_PURCHASE_ORDER_WAREHOUSE = "辅料仓库";

export interface AuxiliaryPurchaseLine {
  key: number;
  序号: number;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  颜色?: string;
  每单位数值?: string;
  单位?: string;
  数量?: number | null;
  单价?: number | null;
  备注?: string;
}

export interface AuxiliaryPurchasePayloadInput {
  supplierNo?: string;
  supplierName?: string;
  deliveryDate?: string;
  note?: string;
  lines: AuxiliaryPurchaseLine[];
}

const clean = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const num = (value?: number | null) => Number(value ?? 0);

export function createAuxiliaryPurchaseLines(count = 20): AuxiliaryPurchaseLine[] {
  return Array.from({ length: count }, (_, i) => ({
    key: i + 1,
    序号: i + 1,
    数量: 0,
    备注: "",
  }));
}

export function applyAuxiliaryMaterialToLine(
  line: AuxiliaryPurchaseLine,
  material: MaterialRow,
): AuxiliaryPurchaseLine {
  return {
    ...line,
    辅料编号: clean(material.物料编号),
    辅料名称: clean(material.物料名称),
    规格: clean(material.规格),
    颜色: clean(material.颜色),
    每单位数值: clean(material.码换算),
    单位: clean(material.单位),
    单价: material.单价 ?? line.单价 ?? undefined,
    数量: line.数量 ?? 0,
    备注: line.备注 ?? "",
  };
}

// —— 采购物料设置消费(预填) ——

// 最小订量预填: 行内数量为空/0 且设置有最小订量时, 返回最小订量作为该行数量初值; 否则 null(不动该行)。
// 仅预填+提示, 不作为硬校验下限(允许低于最小订量的真实下单)。
export function minOrderPrefill(数量: number | null | undefined, 最小订量?: number | null): number | null {
  const min = Number(最小订量 ?? 0);
  if (min <= 0) return null;
  return Number(数量 ?? 0) > 0 ? null : min;
}

// 默认供应商解析: 设置里存自由文本(编号或名称), 在供应商资料中精确匹配;
// 唯一匹配才返回(不匹配/多匹配都不预填, 避免只填名称没编号的半填状态——保存要求供应商编号)。
export function resolveDefaultSupplier<T extends { 供应商编号?: string; 供应商名称?: string }>(
  suppliers: T[],
  默认供应商?: string | null,
): T | null {
  const key = (默认供应商 ?? "").trim();
  if (!key) return null;
  const hits = suppliers.filter(s =>
    (s.供应商编号 ?? "").trim() === key || (s.供应商名称 ?? "").trim() === key);
  return hits.length === 1 ? hits[0] : null;
}

export function summarizeAuxiliaryPurchaseLines(lines: AuxiliaryPurchaseLine[]) {
  return lines.reduce(
    (acc, line) => {
      const quantity = num(line.数量);
      acc.数量 += quantity;
      acc.金额 += quantity * num(line.单价);
      return acc;
    },
    { 数量: 0, 金额: 0 },
  );
}

export function buildAuxiliaryPurchasePayload(input: AuxiliaryPurchasePayloadInput): PurchaseOrderCreate {
  const detail = input.lines
    .filter(line => clean(line.辅料编号) && num(line.数量) > 0)
    .map(line => ({
      物料编号: clean(line.辅料编号)!,
      物料名称: clean(line.辅料名称),
      物料类别: AUXILIARY_PURCHASE_ORDER_CATEGORY,
      规格: clean(line.规格),
      颜色: clean(line.颜色),
      单位: clean(line.单位),
      数量: num(line.数量),
      单价: line.单价 ?? undefined,
      预算数量: num(line.数量),
    }));

  return {
    供应商编号: clean(input.supplierNo) ?? "",
    供应商名称: clean(input.supplierName),
    交货日期: clean(input.deliveryDate),
    仓库: AUXILIARY_PURCHASE_ORDER_WAREHOUSE,
    备注: clean(input.note),
    明细: detail,
  };
}
