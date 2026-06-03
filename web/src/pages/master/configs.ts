export interface FieldCfg { name: string; label: string; price?: boolean }
export interface MasterCfg { menu: string; resource: string; title: string; fields: FieldCfg[] }

export const MASTER_CONFIGS: Record<string, MasterCfg> = {
  客户资料: {
    menu: "客户资料", resource: "customers", title: "客户资料",
    fields: [
      { name: "客户编号", label: "客户编号" }, { name: "客户名称", label: "客户名称" },
      { name: "客户类别", label: "类别" }, { name: "联系人", label: "联系人" },
      { name: "手机", label: "手机" }, { name: "电话", label: "电话" },
      { name: "付款方式", label: "付款方式" }, { name: "备注", label: "备注" },
    ],
  },
  物料资料: {
    menu: "物料资料", resource: "materials", title: "物料资料",
    fields: [
      { name: "物料编号", label: "物料编号" }, { name: "物料名称", label: "物料名称" },
      { name: "物料类别", label: "类别" }, { name: "规格", label: "规格" },
      { name: "颜色", label: "颜色" }, { name: "单位", label: "单位" },
      { name: "单价", label: "单价", price: true }, { name: "销售价", label: "销售价", price: true },
      { name: "供应商编号", label: "供应商编号" }, { name: "备注", label: "备注" },
    ],
  },
};
