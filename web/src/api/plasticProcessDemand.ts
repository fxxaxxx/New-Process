import { api } from "./client";

// 加工件发外需求行（按生产单计算）
export interface PlasticProcessDemandRow {
  生产单号?: string;
  款号?: string;
  工模编号?: string;
  物料编号?: string;
  物料名称?: string;
  颜色?: string;
  单位?: string;
  加工内容?: string;
  加工次序?: string | null; // 第一次/第二次
  加工字母?: string;
  需求量?: number | null;
  白件库存?: number | null;
  已发未回?: number | null;
  需发数量?: number | null;
}

// 生成加工采购单的提交行
export interface PlasticProcessDemandOrderLine {
  款号?: string;
  物料编号?: string;
  物料名称?: string;
  颜色?: string;
  工模编号?: string;
  加工内容?: string;
  加工次序?: string | null;
  加工字母?: string;
  数量: number;
  加工厂编号: string;
  加工厂名称?: string;
  单价?: number | null;
}

// 创建结果（同 生产单号+物料编号+加工内容 已有明细的行自动跳过，幂等防重）
export interface PlasticProcessDemandCreateResult {
  单号列表: string[];
  跳过: number;
}

export const plasticProcessDemandApi = {
  demand: (生产单号: string) =>
    api.get<PlasticProcessDemandRow[]>("/plastic-process-demand", { params: { 生产单号 } }).then(r => r.data),
  createOrders: (生产单号: string, 行: PlasticProcessDemandOrderLine[]) =>
    api.post<PlasticProcessDemandCreateResult>("/plastic-process-demand/create-orders", { 生产单号, 行 }).then(r => r.data),
};
