import { api } from "./client";

export interface PieceLineDto { 工序号: string; 员工号: string; 数量: number; 颜色?: string; 尺码?: string; 扎号?: number }
export interface PieceRecord { 生产单号: string; 裁床单号?: string; 床号?: string; 明细: PieceLineDto[] }
export interface PieceRow {
  id: number; 生产单号?: string; 裁床单号?: string; 工序号?: string; 工序名称?: string;
  员工号?: string; 姓名?: string; 颜色?: string; 尺码?: string; 扎号?: number;
  数量?: number; 单价?: number | null; 金额?: number | null; 审核?: string;
}
export interface PieceSummaryRow { 员工号?: string; 姓名?: string; 工序号?: string; 工序名称?: string; 数量?: number; 金额?: number | null }

export const pieceworkApi = {
  record: (body: PieceRecord) => api.post<{ 录入条数: number }>("/piecework", body).then(r => r.data),
  list: (生产单号: string) => api.get<PieceRow[]>("/piecework", { params: { 生产单号 } }).then(r => r.data),
  remove: (id: number) => api.delete(`/piecework/${id}`),
  approve: (生产单号: string) => api.post("/piecework/approve", null, { params: { 生产单号 } }),
  summary: (生产单号: string) => api.get<PieceSummaryRow[]>("/piecework/summary", { params: { 生产单号 } }).then(r => r.data),
};
