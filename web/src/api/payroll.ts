import { api } from "./client";
import type { Paged } from "./master";

export interface PieceworkPayrollRow { 编号?: string; 姓名?: string; 部门编号?: string; 部门?: string; 数量: number; 计件工资?: number | null }
export const pieceworkPayrollApi = {
  monthly: (月份: string, 部门编号?: string) =>
    api.get<PieceworkPayrollRow[]>("/payroll/piecework", { params: { 月份, 部门编号 } }).then(r => r.data),
};

export interface AbsenceRow {
  id?: number; 工号?: string; 姓名?: string; 部门?: string;
  登记类型?: string; 前后段?: string; 计算出勤?: number; 日期?: string; 事由?: string;
}
export interface AbsenceCreate {
  工号: string; 姓名?: string; 部门?: string; 登记类型?: string; 前后段?: string;
  计算出勤: number; 日期: string; 开始时间?: string; 结束时间?: string; 事由?: string;
}
export interface AttendanceMonthlyRow {
  工号?: string; 姓名?: string; 部门编号?: string; 部门?: string;
  应出勤天数: number; 缺勤天数: number; 实出勤天数: number;
}

export const absenceApi = {
  list: (月份?: string, 工号?: string, 部门编号?: string, page = 1, size = 20) =>
    api.get<Paged<AbsenceRow>>("/payroll/absences", { params: { 月份, 工号, 部门编号, page, size } }),
  create: (body: AbsenceCreate) => api.post<{ id: number }>("/payroll/absences", body),
  remove: (id: number) => api.delete(`/payroll/absences/${id}`),
};

export const attendanceApi = {
  monthly: (月份: string, 应出勤天数: number, 部门编号?: string) =>
    api.get<AttendanceMonthlyRow[]>("/payroll/attendance", { params: { 月份, 应出勤天数, 部门编号 } }).then(r => r.data),
};
