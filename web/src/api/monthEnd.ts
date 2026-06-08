import { api } from "./client";

export interface MonthEndRow {
  年月?: string; 仓库?: string; 口径?: string;
  款号?: string; 款式?: string; 色号?: string; 颜色?: string; 尺码?: string;
  物料编号?: string; 物料名称?: string; 规格?: string; 单位?: string;
  期初: number; 本期入: number; 本期出: number; 结存: number;
}
export interface MonthEndCloseResult { 结数: number; 仓库: string[] }

export const monthEndApi = {
  report: (年月: string, 口径: string, 仓库?: string) =>
    api.get<MonthEndRow[]>("/month-end", { params: { 年月, 口径, 仓库 } }).then(r => r.data),
  periods: (口径: string) =>
    api.get<string[]>("/month-end/periods", { params: { 口径 } }).then(r => r.data),
  close: (body: { 年月: string; 口径: string; 仓库?: string }) =>
    api.post<MonthEndCloseResult>("/month-end/close", body).then(r => r.data),
  reopen: (body: { 年月: string; 口径: string; 仓库?: string }) =>
    api.post<{ 删数: number }>("/month-end/reopen", body).then(r => r.data),
};
