import type { LabelQuery } from "../api/materialLabel";

// 物料分类树/下拉「全部」key（不下发 物料类别 过滤）
export const ALL_CAT = "__ALL__";
// 审核情况「全部」（不下发该过滤）
export const ALL_APPROVAL = "全部";

// 把页面筛选状态归一化为后端查询参数：空串/ALL/全部 → undefined（不下发）。
export function buildLabelQuery(args: {
  keyword?: string;
  selKey?: string;
  审核情况?: string;
  起?: string;
  止?: string;
}): LabelQuery {
  const trim = (v?: string) => {
    const t = v?.trim();
    return t ? t : undefined;
  };
  return {
    keyword: trim(args.keyword),
    物料类别: args.selKey && args.selKey !== ALL_CAT ? args.selKey : undefined,
    审核情况: args.审核情况 && args.审核情况 !== ALL_APPROVAL ? args.审核情况 : undefined,
    起: trim(args.起),
    止: trim(args.止),
  };
}
