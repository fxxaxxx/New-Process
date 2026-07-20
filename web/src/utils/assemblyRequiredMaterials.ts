export const REQUIRED_MATERIAL_ALL = "全部";

export interface RequiredMaterialQueryInput {
  起: string;
  止: string;
  keyword?: string;
  收货仓库?: string;
  类型?: string;
  审核情况?: string;
}

export interface RequiredMaterialOrderLike {
  单号?: string;
}

const clean = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== REQUIRED_MATERIAL_ALL ? trimmed : undefined;
};

export const buildRequiredMaterialQuery = (input: RequiredMaterialQueryInput) => ({
  起: input.起,
  止: input.止,
  keyword: clean(input.keyword),
  收货仓库: clean(input.收货仓库),
  类型: clean(input.类型),
  审核情况: clean(input.审核情况),
});

export const requiredMaterialOrderPath = (row: RequiredMaterialOrderLike) =>
  row.单号
    ? `/assembly-purchase-orders?单号=${encodeURIComponent(row.单号)}`
    : undefined;
