export const FACTORY_CATEGORY_MONTHLY_ALL = "全部";

export interface FactoryCategoryMonthlyQueryInput {
  起: string;
  止: string;
  加工厂?: string;
  keyword?: string;
}

const clean = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== FACTORY_CATEGORY_MONTHLY_ALL ? trimmed : undefined;
};

export const buildFactoryCategoryMonthlyQuery = (input: FactoryCategoryMonthlyQueryInput) => ({
  起: input.起,
  止: input.止,
  加工厂: clean(input.加工厂),
  keyword: clean(input.keyword),
});
