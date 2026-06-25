export interface PlasticDocFieldCfg { name: string; label: string; required?: boolean }
export interface PlasticDocCfg {
  resource: string;
  menu: string;
  title: string;
  headerFields: PlasticDocFieldCfg[];
  listExtra: PlasticDocFieldCfg[];
}

export const PLASTIC_DOC_CONFIGS: Record<string, PlasticDocCfg> = {
  "plastic-receipts": {
    resource: "plastic-receipts", menu: "塑胶入仓单", title: "塑胶入仓",
    headerFields: [
      { name: "供应商编号", label: "供应商编号" }, { name: "供应商名称", label: "供应商名称" },
      { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "供应商名称", label: "供应商" }, { name: "仓库", label: "仓库" }],
  },
};
