import { api } from "./client";
import { masterApi, type Paged } from "./master";

export interface PriceAdjust {
  id: number;
  单号?: string | null;
  日期?: string | null;
  操作员?: string | null;
  审核?: string | null;
  备注?: string | null;
}

export interface PriceAdjustLine {
  id: number;
  单号?: string | null;
  日期?: string | null;
  物料类别?: string | null;
  物料编号?: string | null;
  物料名称?: string | null;
  规格?: string | null;
  颜色?: string | null;
  单位?: string | null;
  原单价?: number | null;
  修改单价?: number | null;
  修改原因?: string | null;
}

export const priceAdjustsApi = masterApi("price-adjusts") as unknown as {
  list: (page?: number, size?: number, keyword?: string) => Promise<Paged<PriceAdjust>>;
  get: (id: number) => Promise<PriceAdjust>;
  create: (body: Partial<PriceAdjust>) => Promise<PriceAdjust>;
  update: (id: number, body: Partial<PriceAdjust>) => Promise<PriceAdjust>;
  remove: (id: number) => Promise<void>;
};

export const priceAdjustLinesApi = masterApi("price-adjust-lines") as unknown as {
  list: (page?: number, size?: number, keyword?: string) => Promise<Paged<PriceAdjustLine>>;
  get: (id: number) => Promise<PriceAdjustLine>;
  create: (body: Partial<PriceAdjustLine>) => Promise<PriceAdjustLine>;
  update: (id: number, body: Partial<PriceAdjustLine>) => Promise<PriceAdjustLine>;
  remove: (id: number) => Promise<void>;
};

export interface ApplyResult { 单号: string; 报价类别: string; 生成报价条数: number }

// 应用调价：把一张调价单的明细写成 报价资料 的新生效价(生效日期=明细日期,缺省=当前时间)
export const applyPriceAdjust = (单号: string, 报价类别: string) =>
  api.post<ApplyResult>(`/master/pricing/apply/${encodeURIComponent(单号)}`, null, { params: { 报价类别 } })
    .then(r => r.data);
