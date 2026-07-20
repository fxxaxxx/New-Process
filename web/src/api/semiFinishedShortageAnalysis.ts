import { api } from "./client";

export type SemiFinishedShortageField = "productCode" | "productName" | "customer" | "partCode";

export interface SemiFinishedShortageQuery {
  field: SemiFinishedShortageField;
  keyword?: string;
  exact: boolean;
  page: number;
  pageSize: number;
}

export interface SemiFinishedShortageRow {
  customer: string;
  productCode: string;
  productName: string;
  partCode: string;
  assemblyName: string;
  unit: string;
  requiredQuantity: number;
  inventoryQuantity: number;
  shortageQuantity: number;
}

export interface SemiFinishedShortageResult {
  items: SemiFinishedShortageRow[];
  total: number;
  page: number;
  pageSize: number;
}

const base = "/semi-finished-shortage-analysis";

export const semiFinishedShortageAnalysisApi = {
  list: (params: SemiFinishedShortageQuery) =>
    api.get<SemiFinishedShortageResult>(base, { params }).then(response => response.data),
  export: (params: SemiFinishedShortageQuery) =>
    api.get<Blob>(`${base}/export`, { params, responseType: "blob" }).then(response => response.data),
};
