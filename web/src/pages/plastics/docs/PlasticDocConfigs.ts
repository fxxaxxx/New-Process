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
  "plastic-issues": {
    resource: "plastic-issues", menu: "塑胶领料单", title: "塑胶领料",
    headerFields: [
      { name: "领料部门", label: "领料部门" }, { name: "领料人", label: "领料人" },
      { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "领料人", label: "领料人" }, { name: "仓库", label: "仓库" }],
  },
  "plastic-returns": {
    resource: "plastic-returns", menu: "塑胶退料单", title: "塑胶退料",
    headerFields: [
      { name: "退料部门", label: "退料部门" }, { name: "退料人", label: "退料人" },
      { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "退料人", label: "退料人" }, { name: "仓库", label: "仓库" }],
  },
  "plastic-warehouse-returns": {
    resource: "plastic-warehouse-returns", menu: "塑胶退仓单", title: "塑胶退仓",
    headerFields: [
      { name: "供应商编号", label: "供应商编号" }, { name: "供应商名称", label: "供应商名称" },
      { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "供应商名称", label: "供应商" }, { name: "仓库", label: "仓库" }],
  },
  "plastic-scraps": {
    resource: "plastic-scraps", menu: "塑胶报废单", title: "塑胶报废",
    headerFields: [
      { name: "报废部门", label: "报废部门" }, { name: "报废人", label: "报废人" },
      { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "报废人", label: "报废人" }, { name: "仓库", label: "仓库" }],
  },
};
