import { api } from "./client";
import type { Paged } from "./master";

export interface ProductionQty { 颜色?: string; 尺码?: string; 数量: number }
export interface ProductionCreate {
  款号: string; 款式?: string; 订单单号?: string; 合同号?: string; 客户款号?: string;
  客户编号?: string; 客户名称?: string; 加工厂编号?: string; 加工厂名称?: string;
  交货日期?: string; 跟单员?: string; 出货单价?: number; 备注?: string;
  数量明细: ProductionQty[];
}
export interface ProductionHeader {
  id: number; 生产单号?: string; 款号?: string; 款式?: string; 合同号?: string;
  客户编号?: string; 客户名称?: string; 加工厂编号?: string; 加工厂名称?: string;
  日期?: string; 交货日期?: string; 制单人?: string;
  计划数量?: number | null; 工序数?: number | null; 工序单价?: number | null;
  物料金额?: number | null; 出货单价?: number | null; 审核?: string; 完成?: string;
}
export interface ProductionDetail {
  单头: ProductionHeader | null;
  数量: { id: number; 颜色?: string; 尺码?: string; 数量?: number }[];
  工序: { id: number; 工序号?: string; 工序名称?: string; 单价?: number | null; 工序类型?: string }[];
  物料: {
    id: number; 物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string;
    总数量?: number; 库存数量?: number; 需订数量?: number;
    预算单价?: number | null; 金额?: number | null; 供应商名称?: string;
  }[];
}

const enc = encodeURIComponent;

export const productionApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<ProductionHeader>>("/production", { params: { page, size, keyword } }).then(r => r.data),
  get: (生产单号: string) => api.get<ProductionDetail>(`/production/${enc(生产单号)}`).then(r => r.data),
  create: (body: ProductionCreate) => api.post<{ 生产单号: string }>("/production", body).then(r => r.data),
  remove: (生产单号: string) => api.delete(`/production/${enc(生产单号)}`),
  approve: (生产单号: string) => api.post(`/production/${enc(生产单号)}/approve`),
  unapprove: (生产单号: string) => api.post(`/production/${enc(生产单号)}/unapprove`),
};
