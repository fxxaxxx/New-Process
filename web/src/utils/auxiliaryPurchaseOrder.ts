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
