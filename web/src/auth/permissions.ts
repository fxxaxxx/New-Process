export type PermAction =
  | "打开" | "保存" | "删除" | "打印" | "单价" | "金额" | "审核" | "反审核" | "功能";

export type PermFlags = Record<PermAction, boolean>;
export type PermMap = Record<string, PermFlags>;

export const can = (m: PermMap, menu: string, a: PermAction): boolean =>
  !!m[menu]?.[a];

// 与后端 PermissionFlags.单价 对齐：无"单价"权限即隐藏所有价格列（成本保密）
export const hidePrice = (m: PermMap, menu: string): boolean =>
  !can(m, menu, "单价");
