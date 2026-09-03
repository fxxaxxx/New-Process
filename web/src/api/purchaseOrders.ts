import { api } from "./client";
import type { Paged } from "./master";

// 采购物料分析带出的待采购物料行（按生产单BOM展开）
export interface PurchaseOrderBasisRow {
  物料编号: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  总数量?: number;
  库存数量?: number;
  可用库存?: number;
  需订数量?: number;
  预算单价?: number | null;
  供应商编号?: string;
  供应商名称?: string;
  合同号?: string;
  已订数量?: number;
}

export interface PurchaseOrderHeader {
  ID: number;
  单号: string;
  日期?: string;
  交货日期?: string;
  供应商编号?: string;
  供应商名称?: string;
  仓库?: string;
  数量?: number | null;
  金额?: number | null;
  操作员?: string;
  审核?: string;
  审核人?: string;
  备注?: string;
  生产单号?: string;
  PO号?: string;
  收件人?: string;
  打印次数?: number | null;
}

export interface PurchaseOrderLine {
  ID: number;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  数量?: number | null;
  单价?: number | null;
  金额?: number | null;
  预算数量?: number | null;
  材料?: string;
  生产单号?: string;
  款号?: string;
  备注?: string;
}

export interface PurchaseOrderDetail {
  单头: PurchaseOrderHeader | null;
  明细: PurchaseOrderLine[];
}

export interface PurchaseOrderProgressRow {
  订购日期?: string;
  交货日期?: string;
  采购单号?: string;
  生产单号?: string;
  款号?: string;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  订购数量?: number | null;
  入仓数量?: number | null;
  欠数?: number | null;
  供应商编号?: string;
  供应商名称?: string;
  操作员?: string;
  审核?: string;
  备注?: string;
}

export interface ProgressQuery {
  供应商?: string;
  起?: string;
  止?: string;
  keyword?: string;
  物料类别?: string;
  日期类型?: string;
  onlyOwed?: boolean;
}

export interface PurchaseOrderProgressDetailRow {
  订购日期?: string;
  交货日期?: string;
  采购单号?: string;
  生产单号?: string;
  款号?: string;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  订购数量?: number | null;
  入仓单号?: string | null;
  入仓数量?: number | null;
  入仓日期?: string | null;
  供应商名称?: string;
  操作员?: string;
  审核?: string;
}

export interface ProgressDetailQuery {
  供应商?: string;
  起?: string;
  止?: string;
  keyword?: string;
  状态?: string;
}

// 订购单查询·明细行（双击 单号 看整单）
export interface PurchaseOrderQueryDetailRow {
  日期?: string;
  单号?: string;
  供应商名称?: string;
  生产单号?: string;
  款号?: string;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  数量?: number | null;
  单价?: number | null;
  金额?: number | null;
  审核?: string;
  备注?: string;
}

// 订购单查询·汇总行（按 物料编号+规格+颜色 合并）
export interface PurchaseOrderQuerySummaryRow {
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  订购数量?: number | null;
}

export interface OrderQuery {
  供应商?: string;
  起?: string;
  止?: string;
  keyword?: string;
  物料类别?: string;
  日期类型?: string;   // 订货日期(默认) | 交货日期
}

export interface PurchaseOrderCreateLine {
  物料编号: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  数量: number;
  单价?: number;
  预算数量?: number;
  材料?: string;
  生产单号?: string;
  款号?: string;
  备注?: string;
}

export interface PurchaseOrderCreate {
  生产单号?: string;
  供应商编号: string;
  供应商名称?: string;
  日期?: string;
  交货日期?: string;
  收件人?: string;
  仓库?: string;
  款号?: string;
  合同号?: string;
  PO号?: string;
  备注?: string;
  明细: PurchaseOrderCreateLine[];
}

const enc = encodeURIComponent;

export const purchaseOrderApi = {
  basis: (生产单号: string) =>
    api.get<PurchaseOrderBasisRow[]>("/purchase-orders/basis", { params: { 生产单号 } }).then(r => r.data),
  list: (page = 1, size = 20, keyword = "") =>
    api.get<Paged<PurchaseOrderHeader>>("/purchase-orders", { params: { page, size, keyword } })
      // 后端按 camelCase 序列化为 id，这里归一化为 ID（与全项目调用方一致）
      .then(r => ({ ...r.data, items: r.data.items.map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })) })),
  get: (单号: string) =>
    api.get<PurchaseOrderDetail>(`/purchase-orders/${enc(单号)}`)
      // 同上：单头与明细行的 id 归一化为 ID;明细兜底空数组防止 null.map 抛错被误认为加载失败
      .then(r => ({
        ...r.data,
        单头: r.data.单头 ? { ...r.data.单头, ID: (r.data.单头 as unknown as { id?: number }).id ?? r.data.单头.ID } : r.data.单头,
        明细: (r.data.明细 ?? []).map(x => ({ ...x, ID: (x as unknown as { id?: number }).id ?? x.ID })),
      })),
  create: (body: PurchaseOrderCreate) =>
    api.post<{ 单号: string }>("/purchase-orders", body).then(r => r.data),
  update: (单号: string, body: PurchaseOrderCreate) =>
    api.put(`/purchase-orders/${enc(单号)}`, body),
  print: (单号: string) =>
    api.post<{ 打印次数: number }>(`/purchase-orders/${enc(单号)}/print`).then(r => r.data),
  remove: (单号: string) => api.delete(`/purchase-orders/${enc(单号)}`),
  approve: (单号: string) => api.post(`/purchase-orders/${enc(单号)}/approve`),
  unapprove: (单号: string) => api.post(`/purchase-orders/${enc(单号)}/unapprove`),
  progress: (q: ProgressQuery) =>
    api.get<PurchaseOrderProgressRow[]>("/purchase-orders/progress", { params: q }).then(r => r.data),
  progressDetail: (q: ProgressDetailQuery) =>
    api.get<PurchaseOrderProgressDetailRow[]>("/purchase-orders/progress-detail", { params: q }).then(r => r.data),
  orderQueryDetail: (q: OrderQuery) =>
    api.get<PurchaseOrderQueryDetailRow[]>("/purchase-orders/order-query/detail", { params: q }).then(r => r.data),
  orderQuerySummary: (q: OrderQuery) =>
    api.get<PurchaseOrderQuerySummaryRow[]>("/purchase-orders/order-query/summary", { params: q }).then(r => r.data),
};
