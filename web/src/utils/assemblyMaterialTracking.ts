export const TRACKING_ALL = "全部";

export interface MaterialTrackingQueryInput {
  起: string;
  止: string;
  keyword?: string;
  收货仓库?: string;
  截止统计?: boolean;
}

export interface MaterialTrackingOrderLike {
  订单单号?: string;
}

const clean = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== TRACKING_ALL ? trimmed : undefined;
};

export const buildMaterialTrackingQuery = (input: MaterialTrackingQueryInput) => ({
  起: input.起,
  止: input.止,
  keyword: clean(input.keyword),
  收货仓库: clean(input.收货仓库),
  截止统计: input.截止统计 === true,
});

export const materialTrackingOrderPath = (row: MaterialTrackingOrderLike) =>
  row.订单单号
    ? `/assembly-purchase-orders?单号=${encodeURIComponent(row.订单单号)}`
    : undefined;
