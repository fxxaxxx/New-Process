export const FACTORY_INVENTORY_ALL = "全部";

export interface FactoryInventoryQueryInput {
  启用日期: boolean;
  起?: string;
  止?: string;
  截止日期: string;
  加工厂?: string;
  物料分类?: string;
  收货仓库?: string;
  keyword?: string;
}

const clean = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed && trimmed !== FACTORY_INVENTORY_ALL ? trimmed : undefined;
};

export const buildFactoryInventoryQuery = (input: FactoryInventoryQueryInput) => ({
  启用日期: input.启用日期,
  起: input.启用日期 ? input.起 : undefined,
  止: input.启用日期 ? input.止 : undefined,
  截止日期: input.截止日期,
  加工厂: clean(input.加工厂),
  物料分类: clean(input.物料分类),
  收货仓库: clean(input.收货仓库),
  keyword: clean(input.keyword),
});
