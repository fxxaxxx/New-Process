export interface PlasticSupplierDocCfg { resource: string; menu: string; title: string }
export const PLASTIC_SUPPLIER_DOC_CONFIGS: Record<string, PlasticSupplierDocCfg> = {
  "plastic-warehouse-returns": { resource: "plastic-warehouse-returns", menu: "塑胶退仓单", title: "塑胶退仓" },
  "plastic-returns":           { resource: "plastic-returns",           menu: "塑胶退料单", title: "塑胶退料" },
  "plastic-scraps":            { resource: "plastic-scraps",            menu: "塑胶报废单", title: "塑胶报废" },
  "plastic-receipts":          { resource: "plastic-receipts",          menu: "塑胶入仓单", title: "塑胶入仓" },
};
