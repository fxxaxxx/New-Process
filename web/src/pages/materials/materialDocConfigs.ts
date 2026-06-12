export interface DocFieldCfg { name: string; label: string; required?: boolean }
export interface MaterialDocCfg {
  resource: string;   // 路由段 + API 资源(purchase-receipts/material-issues/material-returns)
  menu: string;       // 权限菜单(采购入仓单/领料单/退料单)
  title: string;      // 采购入仓/领料/退料
  headerFields: DocFieldCfg[];   // 新建抽屉的单头字段
  listExtra: DocFieldCfg[];      // 列表里单头特有的额外列
  orderPicker?: boolean;   // true=录入行支持"款号选采购订单"(仅采购入仓单)
}

export const MATERIAL_DOC_CONFIGS: Record<string, MaterialDocCfg> = {
  "purchase-receipts": {
    resource: "purchase-receipts", menu: "采购入仓单", title: "采购入仓", orderPicker: true,
    headerFields: [
      { name: "供应商编号", label: "供应商编号" }, { name: "供应商名称", label: "供应商名称" },
      { name: "付款方式", label: "付款方式" }, { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "供应商名称", label: "供应商" }, { name: "仓库", label: "仓库" }],
  },
  "material-issues": {
    resource: "material-issues", menu: "领料单", title: "领料",
    headerFields: [
      { name: "领料部门", label: "领料部门" }, { name: "领料人", label: "领料人" },
      { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "领料部门", label: "领料部门" }, { name: "领料人", label: "领料人" }, { name: "仓库", label: "仓库" }],
  },
  "material-returns": {
    resource: "material-returns", menu: "退料单", title: "退料",
    headerFields: [
      { name: "退料部门", label: "退料部门" }, { name: "退料人", label: "退料人" },
      { name: "仓库", label: "仓库", required: true }, { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "退料部门", label: "退料部门" }, { name: "退料人", label: "退料人" }, { name: "仓库", label: "仓库" }],
  },
  "purchase-returns": {
    resource: "purchase-returns", menu: "采购退仓单", title: "采购退仓", orderPicker: true,
    headerFields: [
      { name: "入仓单号", label: "入仓单号" }, { name: "供应商编号", label: "供应商编号" },
      { name: "供应商名称", label: "供应商名称" }, { name: "仓库", label: "仓库", required: true },
      { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "供应商名称", label: "供应商" }, { name: "仓库", label: "仓库" }],
  },
};
