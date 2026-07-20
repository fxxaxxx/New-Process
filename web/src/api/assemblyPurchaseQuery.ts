import { api } from "./client";

export interface AssemblyPurchaseSummaryRow {
  单号?: string;
  收货仓库?: string;
  产品货号?: string;
  配件编号?: string;
  产品装配名称?: string;
  装配方式?: string;
  生产单号?: string;
  加工数量?: number | null;
}

export interface AssemblyPurchaseDetailRow {
  开单日期?: string;
  单号?: string;
  完成日期?: string;
  收货仓库?: string;
  供应商编号?: string;
  供应商名称?: string;
  产品货号?: string;
  配件编号?: string;
  产品装配名称?: string;
  装配方式?: string;
  生产单号?: string;
  货币?: string;
  数量?: number | null;
  备注?: string;
  审核?: string;
}

export interface AssemblyMaterialTrackingRow {
  订购日期?: string;
  订单单号?: string;
  收货仓库?: string;
  加工厂编号?: string;
  加工厂名称?: string;
  产品货号?: string;
  产品名称?: string;
  配件编号?: string;
  产品装配名称?: string;
  装配方式?: string;
  生产单号?: string;
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  材料?: string;
  颜色?: string;
  单位?: string;
  单件用量?: number | null;
  加工数量?: number | null;
  需求数量?: number | null;
  已入仓数量?: number | null;
  未入仓数量?: number | null;
  审核?: string;
}

export interface AssemblyFactoryInventoryRow {
  加工厂编号?: string;
  加工厂名称?: string;
  收货仓库?: string;
  物料分类?: string;
  产品货号?: string;
  产品名称?: string;
  物料编号?: string;
  物料名称?: string;
  规格?: string;
  材料?: string;
  颜色?: string;
  单位?: string;
  领料数量?: number | null;
  送货数量?: number | null;
  库存数量?: number | null;
  最后订购日期?: string;
  领料送货截止日期?: string;
}

export interface AssemblyRequiredMaterialRow {
  日期?: string;
  单号?: string;
  收货仓库?: string;
  供应商编号?: string;
  供应商名称?: string;
  产品货号?: string;
  产品装配名称?: string;
  装配方式?: string;
  生产单号?: string;
  物料编号?: string;
  物料名称?: string;
  需领数量?: number | null;
  审核?: string;
}

export interface AssemblyFactoryCategoryMonthlyRow {
  加工厂编号?: string;
  加工厂名称?: string;
  收货仓库?: string;
  物料分类?: string;
  产品款数?: number;
  物料款数?: number;
  领料数量?: number | null;
  送货数量?: number | null;
  库存数量?: number | null;
  起始日期?: string;
  截止日期?: string;
}

export interface AssemblyPurchaseOrderHeader {
  单号?: string;
  供应商编号?: string;
  供应商名称?: string;
  出单日期?: string;
  单价?: number | null;
  金额?: number | null;
  收货仓库?: string;
  电脑单号?: string;
  客户?: string;
  备注?: string;
  开始交货日期?: string;
  每天交货?: number | null;
  完成日期?: string;
  收货人?: string;
  审核?: string;
}

export interface AssemblyPurchaseProductLine {
  客户?: string;
  产品货号?: string;
  产品装配名称?: string;
  配件编号?: string;
  装配方式?: string;
  加工数量?: number | null;
  备注?: string;
}

export interface AssemblyPurchaseProductionLine {
  接单日期?: string;
  生产单号?: string;
  产品货号?: string;
  产品名称?: string;
  配件编号?: string;
  产品装配名称?: string;
  加工数量?: number | null;
  单价?: number | null;
  金额?: number | null;
}

export interface AssemblyPurchaseAccessoryLine {
  序号?: number;
  辅料编号?: string;
  辅料名称?: string;
  加工总数量?: number | null;
  单个产品需求量?: number | null;
  需求数克?: number | null;
  需求数个?: number | null;
}

export interface AssemblyPurchaseOrderDetail {
  单头?: AssemblyPurchaseOrderHeader;
  产品明细: AssemblyPurchaseProductLine[];
  生产明细: AssemblyPurchaseProductionLine[];
  辅料表: AssemblyPurchaseAccessoryLine[];
}

export interface AssemblyPurchaseQueryParams {
  起: string;
  止: string;
  keyword?: string;
  收货仓库?: string;
  审核情况?: string;
}

export interface AssemblyMaterialTrackingParams extends AssemblyPurchaseQueryParams {
  截止统计?: boolean;
}

export interface AssemblyFactoryInventoryParams {
  启用日期: boolean;
  起?: string;
  止?: string;
  截止日期: string;
  加工厂?: string;
  物料分类?: string;
  收货仓库?: string;
  keyword?: string;
}

export interface AssemblyRequiredMaterialParams extends AssemblyPurchaseQueryParams {
  类型?: string;
}

export interface AssemblyFactoryCategoryMonthlyParams {
  起: string;
  止: string;
  加工厂?: string;
  keyword?: string;
}

const base = "/assembly-purchase-query";
const enc = encodeURIComponent;

export const assemblyPurchaseQueryApi = {
  summary: (params: AssemblyPurchaseQueryParams) =>
    api.get<AssemblyPurchaseSummaryRow[]>(`${base}/summary`, { params }).then(r => r.data),
  detail: (params: AssemblyPurchaseQueryParams) =>
    api.get<AssemblyPurchaseDetailRow[]>(`${base}/detail`, { params }).then(r => r.data),
  tracking: (params: AssemblyMaterialTrackingParams) =>
    api.get<AssemblyMaterialTrackingRow[]>(`${base}/tracking`, { params }).then(r => r.data),
  factoryInventory: (params: AssemblyFactoryInventoryParams) =>
    api.get<AssemblyFactoryInventoryRow[]>(`${base}/factory-inventory`, { params }).then(r => r.data),
  requiredMaterials: (params: AssemblyRequiredMaterialParams) =>
    api.get<AssemblyRequiredMaterialRow[]>(`${base}/required-materials`, { params }).then(r => r.data),
  factoryCategoryMonthly: (params: AssemblyFactoryCategoryMonthlyParams) =>
    api.get<AssemblyFactoryCategoryMonthlyRow[]>(`${base}/factory-category-monthly`, { params }).then(r => r.data),
  get: (单号: string) =>
    api.get<AssemblyPurchaseOrderDetail>(`${base}/${enc(单号)}`).then(r => r.data),
};
