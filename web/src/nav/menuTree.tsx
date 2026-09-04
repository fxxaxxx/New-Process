// 菜单树·按部门组织(以用户提供的原系统部门菜单截图为准)。
// leaf.path 有值=已建页面路由(可选 perm=9位权限菜单名,无权限则隐藏);无 path=占位(功能开发中)。
// leaf.path 为完整 URL(http 开头)=外部系统入口,点击新标签打开(MainLayout 判断),不挂权限全员可见。
// 空分组不显示(分组下至少要有 1 个叶子才会渲染)。
// 维护提示:新增/补全菜单以原系统截图为准;已建功能对上某项就把 path/perm 补上。

export interface MenuLeaf {
  label: string;
  path?: string;   // 已建路由,或 http 开头的完整 URL=外部系统(新标签打开);缺省=占位
  perm?: string;   // 9位权限菜单名(用于 can(perms,perm,"打开") 隐藏);缺省=不按权限隐藏
}
export interface MenuGroup {
  key: string;
  label: string;
  children: MenuLeaf[];
}

const M = (label: string, path?: string, perm?: string): MenuLeaf => ({ label, path, perm });

// RR-Portal 门户(云服务器)上的外部系统入口;↗ 标记新标签打开
const PORTAL = "http://8.148.146.194";
const X = (label: string, urlPath: string): MenuLeaf => ({ label: `${label}↗`, path: `${PORTAL}${urlPath}` });

export const MENU_TREE: MenuGroup[] = [
  // ① 基础设置
  { key: "g-base", label: "基础设置", children: [
    M("物料快速建档", "/material-create", "物料资料"),
    M("基本资料", "/system/company-profile", "基本资料"),
    M("功能设置", "/system/feature-settings", "功能设置"),
    M("仓库位置设置", "/system/warehouse-locations", "仓库位置设置"),
    M("备份数据", "/system/backup", "备份数据"),
    M("还原数据", "/system/restore"),
    M("塑胶原料资料表", "/plastic-raw-material-master", "塑胶原料资料表"),
    M("啤机机型啤工表", "/system/injection-machine-rates", "啤机机型啤工表"),
    M("供应商资料", "/master/供应商资料", "供应商资料"),
    M("部门人事", "/hr/department-personnel", "部门信息"),
    M("系统用户", "/admin/accounts", "账号管理"),
    M("用户权限", "/admin/accounts", "账号管理"),
    M("用户修改密码", "/change-password"),
    M("网上升级", "/system/upgrade"),
    M("退出软件", "/logout"),
  ]},
  // ② 工程部
  { key: "g-eng", label: "工程部", children: [
    M("款号总表", "/master/款号资料", "款号资料"),
    M("BOM货号查询", "/bom-style-query", "生产制单"),
    M("物料资料", "/material-master", "物料资料"),
    M("塑胶物料资料", "/plastic-material-master", "塑胶物料资料"),
    M("BOM物料设置", "/bom-setup", "款号资料"),
    M("BOM物料查询", "/bom-material-query", "生产制单"),
    M("生产通知单", "/production", "生产制单"),
    // 外部系统(RR-Portal)
    X("工程啤办单", "/rr/"),
    X("模具手办采购订单", "/figure-mold-cost-system/"),
    X("A-doc生成系统", "/zouhuo/"),
  ]},
  // ③ 装配部(生产部)
  { key: "g-prod", label: "装配部(生产部)", children: [
    // 生产管理
    M("生产通知单", "/production", "生产制单"),
    M("生产单跟踪表", "/production-tracking", "生产制单"),
    M("货号接单汇总表", "/order-summary", "生产制单"),
    // 生产领料(装配部向来料仓/塑胶仓下领料单)
    M("领料单(来料仓)", "/materials/material-issues", "领料单"),
    M("塑胶领料单(塑胶仓)", "/plastic-issues", "塑胶领料单"),
    // 外发装配
    M("装配物料设置", "/assembly-material-setup", "款号资料"),
    M("装配物料汇总表", "/assembly-material-summary", "款号资料"),
    M("装配加工采购单", "/assembly-purchase-orders", "款号资料"),
    M("装配采购查询", "/assembly-purchase-query", "款号资料"),
    M("装配采购进度表", "/assembly-purchase-progress", "款号资料"),
    M("装配物料跟踪表", "/assembly-material-tracking", "款号资料"),
    M("加工厂库存汇总表", "/assembly-factory-inventory", "款号资料"),
    M("装配需领明细表", "/assembly-required-material-detail", "款号资料"),
    M("加工厂分类月报表", "/assembly-factory-category-monthly", "款号资料"),
    M("加工厂分类明细表", "/assembly-factory-category-detail", "款号资料"),
    // 外部系统(RR-Portal)
    X("生产计划排拉系统", "/production-plan/"),
  ]},
  // ④ 半成品仓
  { key: "g-semi", label: "半成品仓", children: [
    M("半成品共用物料表", "/semi-finished-common-materials", "半成品共用物料表"),
    M("半成品标签单", "/semi-finished-label-orders", "半成品标签单"),
    M("半成品入仓单", "/semi-receipts", "半成品入仓"),
    M("半成品出库单", "/semi-issues", "半成品领料"),
    // 装配部开领料单(仓库=半成品仓)→半成品仓在这里审核=出库过账(同领料单页,出库即扣半成品库存)
    M("领料出库", "/materials/material-issues", "领料单"),
    M("半成品报废单", "/semi-scraps", "半成品报废"),
    M("半成品盘点单", "/semi-stocktakes", "半成品盘点"),
    M("半成品库存统计表", "/semi-inventory", "半成品库存"),
    M("半成品库存月报表", "/semi-inventory-monthly", "半成品库存"),
  ]},
  // ⑤ 啤机部(流程:PMC下采购单→原料仓领料→白件入塑胶仓;外发啤由PMC/塑胶仓另外下加工订单,不挂啤机部)
  { key: "g-inj", label: "啤机部", children: [
    // 厂内啤机
    M("原料领料单", "/plastic-raw-material-stock-issue", "原料出库表"),
    M("白件入仓单", "/plastic-receipts", "塑胶入仓单"),
    // 外部系统(RR-Portal)
    X("注塑啤机排产系统", "/paiji/"),
    X("啤机外发系统", "/pi-outsource/"),
  ]},
  // ⑥ 喷油部(流程:PMC下订单→喷油领白件→喷油件入仓;复用现有加工订单/白件领料/加工入仓功能,加工内容选喷油;另挂 RR-Portal 外部系统入口)
  { key: "g-spray", label: "喷油部", children: [
    M("喷油加工订单", "/plastic-process-order-make", "塑胶加工订单制作"),
    M("喷油领料单", "/plastic-white-part-issue", "白件领料单"),
    M("喷油件入仓单", "/plastic-receipts", "塑胶入仓单"),
    // 外部系统(RR-Portal)
    X("喷油排产系统(建设中)", "/sprayplan"),
    X("喷油部生产管理", "/penyou/"),
  ]},
  // ⑦ 来料仓(含主料采购)
  { key: "g-wh", label: "来料仓", children: [
    // 采购管理
    M("采购物料分析", "/purchase-material-analysis", "生产制单"),
    M("采购物料设置", "/purchase-material-settings", "采购物料设置"),
    M("BOM订单制作", "/material-order-make", "生产制单"),
    M("采购订单", "/purchase-orders", "采购订单"),
    M("订单进度表", "/order-progress", "采购订单"),
    // 仓库管理
    M("物料资料", "/material-master", "物料资料"),
    M("来料标签单", "/material-label-orders", "来料标签单"),
    M("采购入仓单", "/materials/purchase-receipts", "采购入仓单"),
    M("采购退仓单", "/materials/purchase-returns", "采购退仓单"),
    // 装配部开领料单(未审核)→来料仓在这里审核=出库过账(同页,审核即扣库存)
    M("领料出库", "/materials/material-issues", "领料单"),
    M("退料单", "/materials/material-returns", "退料单"),
    M("报废单", "/materials/material-scraps", "报废单"),
    // 仓库报表
    M("库存统计表", "/material-inventory", "物料库存"),
    M("库存月报表", "/month-end", "库存月结"),
    M("订购单查询", "/purchase-order-query", "采购订单"),
  ]},
  // ⑧ 塑胶仓(含塑胶采购)
  { key: "g-plastic", label: "塑胶仓", children: [
    // 塑胶采购
    M("塑胶采购分析", "/plastic-material-analysis", "塑胶物料单"),
    M("塑胶物料设置", "/plastic-material-settings", "塑胶物料设置"),
    M("塑胶订单制作", "/plastic-order-make", "塑胶订单制作"),
    M("塑胶采购订单", "/plastic-purchase-orders", "塑胶采购订单"),
    // 塑胶仓库
    M("塑胶物料资料", "/plastic-material-master", "塑胶物料资料"),
    M("塑胶共用物料表", "/plastic-common-materials", "塑胶共用物料表"),
    M("塑胶入仓单", "/plastic-receipts", "塑胶入仓单"),
    M("塑胶退仓单", "/plastic-warehouse-returns", "塑胶退仓单"),
    M("塑胶领料单", "/plastic-issues", "塑胶领料单"),
    M("塑胶报废单", "/plastic-scraps", "塑胶报废单"),
    // 塑胶报表
    M("塑胶库存统计表", "/plastic-inventory", "塑胶库存"),
    M("塑胶库存月报表", "/plastic-monthly-report", "塑胶库存月报表"),
    M("塑胶类型客户统计", "/plastic-customer-type-stats", "塑胶类型客户统计"),
  ]},
  // ⑨ 船务部(成品仓;入仓单/查询已合并为一页)
  { key: "g-ship", label: "船务部", children: [
    M("成品入仓单", "/finished-receipts", "成品入仓"),
    // 装配部开领料单(仓库=成品仓,返工领出)→成品仓在这里审核=出库过账(同领料单页,出库即扣成品库存)
    M("领料出库", "/materials/material-issues", "领料单"),
    // 外部系统(RR-Portal)
    X("船务管理系统", "/shipping/"),
  ]},
  // ⑩ 业务部
  { key: "g-biz", label: "业务部", children: [
    M("客户排期表", "/scheduling", "生产排期"),
    M("客户资料", "/master/客户资料", "客户资料"),
    // 外部系统(RR-Portal)
    X("ZURU接单表入单系统", "/zuru-order-system/"),
    X("报价系统", "/baojia/"),
    X("内部报价系统", "/internal-quote/"),
    X("TOMY排期核对系统", "/tomy-paiqi/"),
  ]},
  // ⑪ 原料仓
  { key: "g-raw", label: "原料仓", children: [
    // 原料仓库
    M("原料资料", "/plastic-raw-material-master", "塑胶原料资料表"),
    M("原料生产需求表", "/plastic-raw-material-demand", "原料生产需求表"),
    M("原料采购分析表", "/plastic-raw-material-purchase-analysis", "原料采购分析表"),
    M("原料采购订单", "/plastic-raw-material-purchase-order", "原料采购订单"),
    M("原料入仓单", "/plastic-raw-material-receipt", "原料入仓单"),
    M("原料出库表", "/plastic-raw-material-stock-issue", "原料出库表"),
    M("原料盘点单", "/plastic-raw-material-stocktake", "原料盘点单"),
    // 原料报表
    M("原料库存统计表", "/plastic-raw-material-inventory", "原料库存统计表"),
    M("原料库存月报表", "/plastic-raw-material-monthly", "原料库存月报表"),
    M("原料生产需求汇总", "/plastic-raw-material-demand-summary", "原料生产需求汇总"),
    M("原料订货入库统计", "/plastic-raw-material-order-receipt-stats"),
  ]},
  // ⑫ 品质部(全部为 RR-Portal 外部系统入口)
  { key: "g-qa", label: "品质部", children: [
    X("QA测试报告周结", "/qa-weekly-report/"),
    X("QC成品报告系统", "/qc-report/"),
    X("品质管理系统(QMS)", "/qc/"),
  ]},
  // ⑬ PMC仓务(外部系统入口)
  { key: "g-pmc", label: "PMC仓务", children: [
    X("加工厂月度评审", "/factory-review/"),
  ]},
  // ⑭ 印尼小组(外部系统入口)
  { key: "g-indo", label: "印尼小组", children: [
    X("印尼走货明细(印尼专用)", "/indo-shipping/"),
  ]},
];
