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
  客户类别: { menu: "客户类别", resource: "customer-categories", title: "客户类别",
    fields: [{ name: "类别", label: "类别" }, { name: "名称", label: "名称" }] },
  供应商类别: { menu: "供应商类别", resource: "supplier-categories", title: "供应商类别",
    fields: [{ name: "类别", label: "类别" }, { name: "名称", label: "名称" }] },
  供应商资料: { menu: "供应商资料", resource: "suppliers", title: "供应商资料",
    fields: [
      { name: "供应商编号", label: "编号" }, { name: "供应商名称", label: "名称" },
      { name: "供应商类别", label: "类别" }, { name: "联系人", label: "联系人" },
      { name: "手机", label: "手机" }, { name: "货币", label: "货币" }, { name: "备注", label: "备注" }] },
  加工厂类别: { menu: "加工厂类别", resource: "factory-categories", title: "加工厂类别",
    fields: [{ name: "类别", label: "类别" }, { name: "名称", label: "名称" }] },
  加工厂资料: { menu: "加工厂资料", resource: "factories", title: "加工厂资料",
    fields: [
      { name: "加工厂编号", label: "编号" }, { name: "加工厂名称", label: "名称" },
      { name: "加工厂类别", label: "类别" }, { name: "联系人", label: "联系人" },
      { name: "手机", label: "手机" }, { name: "备注", label: "备注" }] },
  物料类别: { menu: "物料类别", resource: "material-categories", title: "物料类别",
    fields: [{ name: "编号", label: "编号" }, { name: "名称", label: "名称" }, { name: "类别", label: "类别" }] },
  部门信息: { menu: "部门信息", resource: "departments", title: "部门信息",
    fields: [{ name: "编号", label: "编号" }, { name: "部门", label: "部门" }, { name: "备注", label: "备注" }] },
  人事档案: { menu: "人事档案", resource: "employees", title: "人事档案",
    fields: [
      { name: "编号", label: "编号" }, { name: "姓名", label: "姓名" },
      { name: "考勤卡号", label: "考勤卡号" }, { name: "部门编号", label: "部门" },
      { name: "工序类型", label: "工序类型" }, { name: "基本工资", label: "基本工资", price: true },
      { name: "在职", label: "在职" }, { name: "默认班次", label: "默认班次" }] },
  报价类别: { menu: "报价类别", resource: "quote-categories", title: "报价类别",
    fields: [{ name: "编号", label: "编号" }, { name: "名称", label: "名称" }, { name: "类别", label: "类别" }] },
  报价资料: { menu: "报价资料", resource: "quotes", title: "报价资料",
    fields: [
      { name: "报价类别", label: "报价类别" }, { name: "物料编号", label: "物料编号" },
      { name: "物料名称", label: "物料名称" }, { name: "规格", label: "规格" },
      { name: "颜色", label: "颜色" }, { name: "单位", label: "单位" },
      { name: "单价", label: "单价", price: true }, { name: "销售价", label: "销售价", price: true }] },
};
