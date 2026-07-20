import type { MaterialRow } from "../api/materialMaster";

export const AUXILIARY_PURCHASE_RETURN_CATEGORY = "辅料资料";
export const AUXILIARY_PURCHASE_RETURN_WAREHOUSE = "辅料仓库";
export const AUXILIARY_PURCHASE_RETURN_PRICE_TYPE = "人民币";

export interface AuxiliaryPurchaseReturnLine {
  key: number;
  序号: number;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  颜色?: string;
  每单位数值?: string;
  单价类型?: string;
  单位?: string;
  数量?: number | null;
  单价?: number | null;
  备注?: string;
}

export interface AuxiliaryPurchaseReturnPayloadInput {
  supplierNo?: string;
  supplierName?: string;
  date?: string;
  receiptNo?: string;
  note?: string;
  lines: AuxiliaryPurchaseReturnLine[];
}

export interface AuxiliaryPurchaseReturnPayload {
  入仓单号?: string;
  供应商编号: string;
  供应商名称?: string;
  日期?: string;
  仓库: string;
  备注?: string;
  明细: {
    物料编号: string;
    物料名称?: string;
    物料类别: string;
    规格?: string;
    颜色?: string;
    单位?: string;
    数量: number;
    单价?: number;
    金额?: number;
    备注?: string;
  }[];
}

const clean = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const num = (value?: number | null) => Number(value ?? 0);

export function createAuxiliaryPurchaseReturnLines(count = 20): AuxiliaryPurchaseReturnLine[] {
  return Array.from({ length: count }, (_, i) => ({
    key: i + 1,
    序号: i + 1,
    单价类型: AUXILIARY_PURCHASE_RETURN_PRICE_TYPE,
    数量: 0,
    备注: "",
  }));
}

export function applyAuxiliaryPurchaseReturnMaterialToLine(
  line: AuxiliaryPurchaseReturnLine,
  material: MaterialRow,
): AuxiliaryPurchaseReturnLine {
  return {
    ...line,
    辅料编号: clean(material.物料编号),
    辅料名称: clean(material.物料名称),
    规格: clean(material.规格),
    颜色: clean(material.颜色),
    每单位数值: clean(material.码换算),
    单价类型: line.单价类型 ?? AUXILIARY_PURCHASE_RETURN_PRICE_TYPE,
    单位: clean(material.单位),
    单价: material.单价 ?? line.单价 ?? undefined,
    数量: line.数量 ?? 0,
    备注: line.备注 ?? "",
  };
}

export function isAuxiliaryPurchaseReturnLineBlank(line: AuxiliaryPurchaseReturnLine) {
  return !clean(line.辅料编号)
    && !clean(line.辅料名称)
    && !clean(line.规格)
    && !clean(line.单位)
    && num(line.数量) === 0
    && !clean(line.备注);
}

export function compactAuxiliaryPurchaseReturnLines(lines: AuxiliaryPurchaseReturnLine[]) {
  return lines
    .filter(line => !isAuxiliaryPurchaseReturnLineBlank(line))
    .map((line, index) => ({ ...line, key: index + 1, 序号: index + 1 }));
}

export function summarizeAuxiliaryPurchaseReturnLines(lines: AuxiliaryPurchaseReturnLine[]) {
  return lines.reduce(
    (acc, line) => {
      if (!clean(line.辅料编号)) return acc;
      const quantity = num(line.数量);
      acc.数量 += quantity;
      acc.金额 += quantity * num(line.单价);
      return acc;
    },
    { 数量: 0, 金额: 0 },
  );
}

export function buildAuxiliaryPurchaseReturnPayload(
  input: AuxiliaryPurchaseReturnPayloadInput,
): AuxiliaryPurchaseReturnPayload {
  const detail = input.lines
    .filter(line => clean(line.辅料编号) && num(line.数量) > 0)
    .map(line => {
      const quantity = num(line.数量);
      const price = line.单价 ?? undefined;
      return {
        物料编号: clean(line.辅料编号)!,
        物料名称: clean(line.辅料名称),
        物料类别: AUXILIARY_PURCHASE_RETURN_CATEGORY,
        规格: clean(line.规格),
        颜色: clean(line.颜色),
        单位: clean(line.单位),
        数量: quantity,
        单价: price,
        金额: price === undefined ? undefined : quantity * price,
        备注: clean(line.备注),
      };
    });

  return {
    入仓单号: clean(input.receiptNo),
    供应商编号: clean(input.supplierNo) ?? "",
    供应商名称: clean(input.supplierName),
    日期: clean(input.date),
    仓库: AUXILIARY_PURCHASE_RETURN_WAREHOUSE,
    备注: clean(input.note),
    明细: detail,
  };
}
