import type { ProgressQuery, PurchaseOrderProgressRow } from "../api/purchaseOrders";

export const AUXILIARY_PURCHASE_PROGRESS_CATEGORY = "辅料资料";

export type AuxiliaryArrivalStatus = "未到" | "已到" | "全部";
export type AuxiliaryProgressDateMode = "不选择日期" | "订购日期" | "交货日期";

export interface AuxiliaryPurchaseProgressQueryInput {
  arrivalStatus: AuxiliaryArrivalStatus;
  dateMode: AuxiliaryProgressDateMode;
  startDate?: string;
  endDate?: string;
  keyword?: string;
  onlyThreeDays?: boolean;
  today?: string;
}

export interface AuxiliaryPurchaseProgressRow {
  订购日期?: string;
  交货日期?: string;
  订单单号?: string;
  供应商编号?: string;
  供应商名称?: string;
  辅料编号?: string;
  辅料名称?: string;
  规格?: string;
  单位?: string;
  单价类型?: string;
  订货数量?: number | null;
  入仓数量?: number | null;
  相差数量?: number | null;
  操作员?: string;
  备注?: string;
  审核?: string;
}

const trim = (value?: string | null) => {
  const text = String(value ?? "").trim();
  return text || undefined;
};

const d10 = (value?: string | null) => (value ? String(value).slice(0, 10) : undefined);

function addDays(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildAuxiliaryPurchaseProgressQuery(input: AuxiliaryPurchaseProgressQueryInput): ProgressQuery {
  const keyword = trim(input.keyword);
  if (input.onlyThreeDays) {
    const today = input.today ?? new Date().toISOString().slice(0, 10);
    return {
      物料类别: AUXILIARY_PURCHASE_PROGRESS_CATEGORY,
      keyword,
      起: today,
      止: addDays(today, 3),
      日期类型: "交货日期",
      onlyOwed: input.arrivalStatus === "未到" ? true : undefined,
    };
  }

  const useDate = input.dateMode !== "不选择日期";
  return {
    物料类别: AUXILIARY_PURCHASE_PROGRESS_CATEGORY,
    keyword,
    起: useDate ? trim(input.startDate) : undefined,
    止: useDate ? trim(input.endDate) : undefined,
    日期类型: useDate ? input.dateMode : undefined,
    onlyOwed: input.arrivalStatus === "未到" ? true : undefined,
  };
}

export function normalizeAuxiliaryPurchaseProgressRow(row: PurchaseOrderProgressRow): AuxiliaryPurchaseProgressRow {
  return {
    订购日期: d10(row.订购日期),
    交货日期: d10(row.交货日期),
    订单单号: row.采购单号,
    供应商编号: row.供应商编号,
    供应商名称: row.供应商名称,
    辅料编号: row.物料编号,
    辅料名称: row.物料名称,
    规格: row.规格,
    单位: row.单位,
    单价类型: "人民币",
    订货数量: row.订购数量 ?? 0,
    入仓数量: row.入仓数量 ?? 0,
    相差数量: row.欠数 ?? 0,
    操作员: row.操作员,
    备注: row.备注,
    审核: row.审核,
  };
}

export function getAuxiliaryProgressTextColor(row: Pick<AuxiliaryPurchaseProgressRow, "相差数量">) {
  return Number(row.相差数量 ?? 0) > 0 ? "#d000d0" : "#111111";
}
