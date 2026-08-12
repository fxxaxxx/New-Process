import { api } from "./client";
import type { Paged } from "./master";

export interface ProductionQty { 颜色?: string; 尺码?: string; 数量: number }

// 货号明细行（创建用）
export interface ProductionGoodsLine {
  货号: string; BOM款号: string; 款号名称?: string;
  比例?: number; 分析?: boolean;
  数量明细: ProductionQty[];
}

// 单据创建 DTO（一单多货号）
export interface ProductionNoticeCreate {
  订单类型?: string; 标识?: string; 装箱方式?: string; 订单总箱数?: number; 默认单价?: string;
  客户编号?: string; 客户名称?: string; 客户款号?: string; 合同号?: string;
  加工厂编号?: string; 加工厂名称?: string; 交货日期?: string; 跟单员?: string;
  下单日期?: string; 备注?: string; 订单单号?: string;
  货号明细: ProductionGoodsLine[];
}

export interface ProductionHeader {
  id: number; 生产单号?: string; 款号?: string; 款式?: string; 合同号?: string;
  客户编号?: string; 客户名称?: string; 客户款号?: string; 加工厂编号?: string; 加工厂名称?: string;
  订单类型?: string; 标识?: string; 装箱方式?: string; 订单总箱数?: number | null; 默认单价?: string;
  日期?: string; 下单日期?: string; 交货日期?: string; 制单人?: string; 跟单员?: string; 备注?: string;
  订单单号?: string;
  计划数量?: number | null; 工序数?: number | null; 工序单价?: number | null;
  物料金额?: number | null; 出货单价?: number | null; 审核?: string; 完成?: string;
}

export interface ProductionGoodsDetail {
  序号?: number; 货号?: string; BOM款号?: string; 款号名称?: string;
  数量?: number | null; 比例?: number | null; 分析?: boolean;
}

export interface ProductionDetail {
  单头: ProductionHeader | null;
  货号明细: ProductionGoodsDetail[];
  数量: { 货号?: string; 颜色?: string; 尺码?: string; 数量?: number }[];
  工序: { 货号?: string; 工序号?: string; 工序名称?: string; 单价?: number | null; 工序类型?: string }[];
  物料: {
    货号?: string; 物料编号?: string; 物料名称?: string; 规格?: string; 颜色?: string; 单位?: string;
    总数量?: number; 库存数量?: number; 可用库存?: number; 需订数量?: number;
    预算单价?: number | null; 金额?: number | null; 供应商编号?: string; 供应商名称?: string;
  }[];
}

// 领料应领行(issue-basis):生产单 BOM 展开快照按物料聚合 数量=应领(接单数×BOM用量);档=来料/塑胶 按档案过滤
export interface IssueBasisRow {
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string;
  规格?: string; 颜色?: string; 单位?: string; 数量: number;
}

// MO单跟踪行（生产通知单MO单）
export interface MoLine {
  序号?: number | null;
  接单日期?: string | null;
  正单合同号?: string | null;
  产品货号?: string | null;
  产品名称?: string | null;
  接单数量?: number | null;
  装箱方式?: string | null;
  订单总箱数?: number | null;
  验货日期?: string | null;
  备注?: string | null;
}

const enc = encodeURIComponent;

export const productionApi = {
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<ProductionHeader>>("/production", { params: { page, size, keyword } }).then(r => r.data),
  get: (生产单号: string) => api.get<ProductionDetail>(`/production/${enc(生产单号)}`).then(r => r.data),
  create: (body: ProductionNoticeCreate) => api.post<{ 生产单号: string }>("/production", body).then(r => r.data),
  remove: (生产单号: string) => api.delete(`/production/${enc(生产单号)}`),
  approve: (生产单号: string) => api.post(`/production/${enc(生产单号)}/approve`),
  unapprove: (生产单号: string) => api.post(`/production/${enc(生产单号)}/unapprove`),
  getMo: (生产单号: string) =>
    api.get<MoLine[]>(`/production/${enc(生产单号)}/mo`).then(r => r.data),
  saveMo: (生产单号: string, lines: MoLine[]) =>
    api.put(`/production/${enc(生产单号)}/mo`, lines),
  // 领料应领明细(供领料单按生产单一键带入):档=来料/塑胶
  issueBasis: (生产单号: string, 档: "来料" | "塑胶") =>
    api.get<IssueBasisRow[]>(`/production/${enc(生产单号)}/issue-basis`, { params: { 档 } }).then(r => r.data),
};
