import { api } from "./client";
import type {
  AuxiliaryPurchaseAnalysisQuery,
  AuxiliaryPurchaseAnalysisRow,
} from "../utils/auxiliaryPurchaseAnalysis";

export type { AuxiliaryPurchaseAnalysisQuery, AuxiliaryPurchaseAnalysisRow };

export const auxiliaryPurchaseAnalysisApi = {
  list: (params: AuxiliaryPurchaseAnalysisQuery) =>
    api.get<AuxiliaryPurchaseAnalysisRow[]>("/auxiliary-purchase-analysis", { params }).then(r => r.data),
};
