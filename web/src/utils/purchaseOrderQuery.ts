import type { OrderQuery } from "../api/purchaseOrders";

// 物料分类树「全部」节点 key（选中时不下发 物料类别 过滤）
export const ALL_CAT = "__ALL__";

// 把页面筛选状态归一化为后端查询参数：空串/ALL → undefined（不下发该条件）。
// 起/止 传入已格式化的日期串（YYYY-MM-DD）或空。
export function buildOrderQuery(args: {
  供应商?: string;
  keyword?: string;
  selKey?: string;
  起?: string;
  止?: string;
  日期类型?: string;
}): OrderQuery {
  const trim = (v?: string) => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  return {
    供应商: trim(args.供应商),
    keyword: trim(args.keyword),
    物料类别: args.selKey && args.selKey !== ALL_CAT ? args.selKey : undefined,
    起: trim(args.起),
    止: trim(args.止),
    日期类型: trim(args.日期类型),
  };
}
