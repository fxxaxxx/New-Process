export interface PlasticReceiptFormCfg { resource: string; menu: string; title: string; allowReceiptPick?: boolean }
export const PLASTIC_RECEIPT_FORM_CONFIGS: Record<string, PlasticReceiptFormCfg> = {
  "plastic-receipts":          { resource: "plastic-receipts",          menu: "塑胶入仓单", title: "塑胶入仓（加工入仓）" },
  "plastic-warehouse-returns": { resource: "plastic-warehouse-returns", menu: "塑胶退仓单", title: "塑胶退仓（加工退仓）", allowReceiptPick: true },
};
