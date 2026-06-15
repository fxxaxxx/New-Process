// type 控制单头字段渲染：text=普通输入；date-today=只读当天；docno=只读电脑单号(保存后自动)；
// operator=只读操作员(当前用户)；employee=输入框+🔍选人(人事档案)
export type DocFieldType = "text" | "date-today" | "docno" | "operator" | "employee";
export interface DocFieldCfg { name: string; label: string; required?: boolean; type?: DocFieldType }
export interface MaterialDocCfg {
  resource: string;   // 路由段 + API 资源(purchase-receipts/material-issues/material-returns)
  menu: string;       // 权限菜单(采购入仓单/领料单/退料单)
  title: string;      // 采购入仓/领料/退料
  headerFields: DocFieldCfg[];   // 新建抽屉的单头字段
  listExtra: DocFieldCfg[];      // 列表里单头特有的额外列
  orderPicker?: boolean;   // true=录入行支持"款号选采购订单"(仅采购入仓单)
  usageCols?: boolean;     // true=领料/退料,行表显示 生产单号/款号/材料/备注 列(与 orderPicker 互斥)
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
    resource: "material-issues", menu: "领料单", title: "领料", usageCols: true,
    // 按原系统表头：部门/日期/领料人(🔍)/电脑单号/操作员/仓库/备注(仓库为本系统过账必需，原图无)
    headerFields: [
      { name: "领料部门", label: "部门" }, { name: "日期", label: "日期", type: "date-today" },
      { name: "领料人", label: "领料人", type: "employee" }, { name: "单号", label: "电脑单号", type: "docno" },
      { name: "操作员", label: "操作员", type: "operator" }, { name: "仓库", label: "仓库", required: true },
      { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "领料部门", label: "领料部门" }, { name: "领料人", label: "领料人" }, { name: "仓库", label: "仓库" }],
  },
  "material-returns": {
    resource: "material-returns", menu: "退料单", title: "退料", usageCols: true,
    // 按原系统表头：部门/日期/退料人(🔍)/电脑单号/操作员/仓库/备注(仓库为本系统过账必需，原图无)
    headerFields: [
      { name: "退料部门", label: "部门" }, { name: "日期", label: "日期", type: "date-today" },
      { name: "退料人", label: "退料人", type: "employee" }, { name: "单号", label: "电脑单号", type: "docno" },
      { name: "操作员", label: "操作员", type: "operator" }, { name: "仓库", label: "仓库", required: true },
      { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "退料部门", label: "退料部门" }, { name: "退料人", label: "退料人" }, { name: "仓库", label: "仓库" }],
  },
  "material-scraps": {
    resource: "material-scraps", menu: "报废单", title: "报废", usageCols: true,
    // 按退料单同构表头：部门/日期/报废人(🔍)/电脑单号/操作员/仓库/备注
    headerFields: [
      { name: "报废部门", label: "部门" }, { name: "日期", label: "日期", type: "date-today" },
      { name: "报废人", label: "报废人", type: "employee" }, { name: "单号", label: "电脑单号", type: "docno" },
      { name: "操作员", label: "操作员", type: "operator" }, { name: "仓库", label: "仓库", required: true },
      { name: "备注", label: "备注" },
    ],
    listExtra: [{ name: "报废部门", label: "报废部门" }, { name: "报废人", label: "报废人" }, { name: "仓库", label: "仓库" }],
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
