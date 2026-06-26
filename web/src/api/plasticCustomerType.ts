import { api } from "./client";

export interface PlasticCustomerTypeStatRow {
  客户?: string; 类型?: string; 数量: number; 金额?: number | null;
}
export const plasticCustomerTypeApi = {
  list: (起: string, 止: string, 客户?: string) =>
    api.get<PlasticCustomerTypeStatRow[]>("/plastic-customer-type-stats", { params: { 起, 止, 客户 } }).then(r => r.data),
};
