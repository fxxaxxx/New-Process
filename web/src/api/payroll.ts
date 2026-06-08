import { api } from "./client";
export interface PieceworkPayrollRow { 编号?: string; 姓名?: string; 部门编号?: string; 部门?: string; 数量: number; 计件工资?: number | null }
export const pieceworkPayrollApi = {
  monthly: (月份: string, 部门编号?: string) =>
    api.get<PieceworkPayrollRow[]>("/payroll/piecework", { params: { 月份, 部门编号 } }).then(r => r.data),
};
