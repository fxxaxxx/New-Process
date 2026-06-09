import { api } from "./client";

const enc = encodeURIComponent;

export interface AccountRow {
  用户?: string;
  登录状态?: string;
  上次登录?: string;
  日期?: string;
  登录失败次数?: number;
  锁定到期?: string;
  已锁定?: boolean;
}

export interface MenuEntry { 组: string; 菜单: string }

export interface MenuPermRow {
  组?: string;
  菜单: string;
  打开: boolean;
  保存: boolean;
  删除: boolean;
  打印: boolean;
  单价: boolean;
  金额: boolean;
  审核: boolean;
  反审核: boolean;
  功能: boolean;
}

export const accountApi = {
  list: (keyword = "") =>
    api.get<AccountRow[]>("/admin/accounts", { params: { keyword } }).then(r => r.data),
  register: (body: { 用户名: string; 初始密码: string }) =>
    api.post("/admin/accounts", body),
  resetPassword: (用户: string, body: { 新密码: string }) =>
    api.post(`/admin/accounts/${enc(用户)}/reset-password`, body),
  lock: (用户: string) => api.post(`/admin/accounts/${enc(用户)}/lock`),
  unlock: (用户: string) => api.post(`/admin/accounts/${enc(用户)}/unlock`),
  remove: (用户: string) => api.delete(`/admin/accounts/${enc(用户)}`),
};

export const adminApi = {
  menus: () => api.get<MenuEntry[]>("/admin/menus").then(r => r.data),
};

export const userPermApi = {
  get: (用户: string) =>
    api.get<MenuPermRow[]>(`/admin/accounts/${enc(用户)}/perms`).then(r => r.data),
  save: (用户: string, body: { 用户名: string; 明细: MenuPermRow[] }) =>
    api.put(`/admin/accounts/${enc(用户)}/perms`, body),
};
