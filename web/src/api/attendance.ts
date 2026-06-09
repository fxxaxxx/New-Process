import { api } from "./client";

const enc = encodeURIComponent;

export interface ShiftRow {
  识别?: string; 名称?: string;
  上午上班?: string; 上午下班?: string; 下午上班?: string; 下午下班?: string;
  总小时?: number; 迟到分钟?: number; 早退分钟?: number;
}
export interface RosterRow { 工号?: string; 姓名?: string; 日期?: string; 班次?: string }
export interface RosterAssign { 工号集合: string[]; 开始日期: string; 结束日期: string; 班次: string }

export const shiftApi = {
  list: (keyword = "") =>
    api.get<ShiftRow[]>("/attendance/shifts", { params: { keyword } }).then(r => r.data),
  get: (识别: string) =>
    api.get<ShiftRow>(`/attendance/shifts/${enc(识别)}`).then(r => r.data),
  save: (body: ShiftRow) => api.post("/attendance/shifts", body),
  remove: (识别: string) => api.delete(`/attendance/shifts/${enc(识别)}`),
};

export const rosterApi = {
  list: (开始: string, 结束: string, 部门编号?: string) =>
    api.get<RosterRow[]>("/attendance/rosters", { params: { 开始, 结束, 部门编号 } }).then(r => r.data),
  assign: (body: RosterAssign) => api.post("/attendance/rosters/assign", body),
  remove: (工号: string, 日期: string) =>
    api.delete("/attendance/rosters", { params: { 工号, 日期 } }),
};

export interface DailyRow {
  工号?: string; 姓名?: string; 部门?: string; 日期?: string;
  上午?: number | string; 下午?: number | string; 合计时间?: number | string; 加班?: number | string;
  迟到分?: number | string; 早退分?: number | string; 迟到次数?: number | string; 早退次数?: number | string;
}
export interface DailySave { 工号: string; 日期: string; 刷卡: string[] }

export const dailyApi = {
  list: (工号: string | undefined, 开始: string, 结束: string, 部门?: string) =>
    api.get<DailyRow[]>("/attendance/daily", { params: { 工号, 开始, 结束, 部门 } }).then(r => r.data),
  save: (body: DailySave) => api.post("/attendance/daily", body),
};
