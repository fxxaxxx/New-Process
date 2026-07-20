export const AUXILIARY_PURCHASE_DEFAULT_CATEGORY = "辅料资料";

export interface AuxiliaryPurchaseAnalysisQueryInput {
  category?: string;
  keyword?: string;
  onlyBuy: boolean;
}

export interface AuxiliaryPurchaseAnalysisQuery {
  物料类别?: string;
  keyword?: string;
  onlyBuy: boolean;
}

export interface AuxiliaryPurchaseAnalysisRow {
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  单位?: string;
  库存数量?: number | null;
  在途数量?: number | null;
  需领数量?: number | null;
  可用库存?: number | null;
  订货数量?: number | null;
  供应商?: string;
}

const num = (v: number | null | undefined) => Number(v ?? 0);

export function buildAuxiliaryPurchaseAnalysisQuery(
  input: AuxiliaryPurchaseAnalysisQueryInput,
): AuxiliaryPurchaseAnalysisQuery {
  return {
    物料类别: input.category?.trim() || undefined,
    keyword: input.keyword?.trim() || undefined,
    onlyBuy: input.onlyBuy,
  };
}

export function normalizeAuxiliaryPurchaseRow(
  row: AuxiliaryPurchaseAnalysisRow,
): AuxiliaryPurchaseAnalysisRow {
  const 库存数量 = num(row.库存数量);
  const 在途数量 = num(row.在途数量);
  const 需领数量 = num(row.需领数量);
  const fallbackAvailable = 库存数量 + 在途数量 - 需领数量;
  const 可用库存 = row.可用库存 ?? fallbackAvailable;
  const 订货数量 = row.订货数量 ?? Math.max(-可用库存, 0);
  return {
    ...row,
    库存数量,
    在途数量,
    需领数量,
    可用库存,
    订货数量,
  };
}
