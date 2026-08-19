import { api } from "./client";
import type { Paged } from "./master";

export interface ScheduleRow {
  ID: number; 批次ID: number; 排期客户?: string; 状态?: string;
  接单日期?: string; 客户名称?: string; 国家?: string;
  PO号?: string; 客PO?: string; SKU?: string; 货号?: string; 品名?: string;
  数量?: number; 内箱?: number; 外箱?: number; 总箱数?: number;
  走货期?: string; 验货期?: string; 第三方验货?: string; 车间?: string;
  来源工作表?: string; 备注?: string; 原始数据?: string; 创建日期?: string; 操作员?: string;
}
export interface ScheduleBatch {
  ID: number; 排期客户?: string; 文件名?: string; 导入日期?: string;
  操作员?: string; 新增: number; 更新: number; 行数: number; 备注?: string;
}
export interface ScheduleSummary { 排期客户?: string; 状态?: string; 行数: number; 数量?: number }
export interface ScheduleFile {
  ID: number; 排期客户?: string; 文件名?: string; 导入日期?: string; 操作员?: string;
  行数: number; 货号数: number; 在排: number; 已走货: number; 已取消: number;
}
export interface ScheduleImportResult {
  批次ID: number; 新增: number; 更新: number; 跳过: number; 失败: number;
  失败明细: { 行号: number; 物料编号?: string; 原因: string }[];
}

export interface ScheduleListParams {
  page?: number; size?: number; keyword?: string;
  排期客户?: string; 状态?: string; 走货期从?: string; 走货期至?: string; 批次ID?: number;
}

export const schedulingApi = {
  list: (p: ScheduleListParams) =>
    api.get<Paged<ScheduleRow>>("/scheduling", { params: p }).then(r => r.data),
  files: (排期客户?: string, keyword?: string) =>
    api.get<ScheduleFile[]>("/scheduling/files", { params: { 排期客户, keyword } }).then(r => r.data),
  batches: () => api.get<ScheduleBatch[]>("/scheduling/batches").then(r => r.data),
  summary: () => api.get<ScheduleSummary[]>("/scheduling/summary").then(r => r.data),
  customers: () => api.get<string[]>("/scheduling/customers").then(r => r.data),
  import: (排期客户: string, 文件名: string, rows: Record<string, unknown>[]) =>
    api.post<ScheduleImportResult>("/scheduling/import", { 排期客户, 文件名, rows }).then(r => r.data),
  removeBatch: (批次ID: number) => api.delete(`/scheduling/batches/${批次ID}`),
};
