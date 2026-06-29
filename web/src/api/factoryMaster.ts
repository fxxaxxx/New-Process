import { api } from "./client";
import type { Paged } from "./master";
export interface FactoryCategoryNode { 类别?: string; 数量: number }
export interface FactoryRow {
  ID: number; 加工厂类别?: string; 加工厂编号?: string; 加工厂名称?: string; 联系人?: string;
  手机?: string; 电话?: string; 传真?: string; 联系地址?: string; 付款方式?: string; 备注?: string;
}
export const factoryMasterApi = {
  categories: () => api.get<FactoryCategoryNode[]>("/factory-master/categories").then(r => r.data),
  list: (类别?: string, keyword?: string, page = 1, size = 50) =>
    api.get<Paged<FactoryRow>>("/factory-master", { params: { 类别, keyword, page, size } }).then(r => r.data),
};
