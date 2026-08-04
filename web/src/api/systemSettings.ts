import { api } from "./client";

// 基本设置组的键值型设置(基本资料/功能设置),后端存于系统配置表
export interface SettingItem { 键: string; 标签: string; 值?: string | null }

const get = (url: string) => api.get<SettingItem[]>(url).then(r => r.data);
const put = (url: string, 值: Record<string, string>) =>
  api.put<{ 消息?: string }>(url, { 值 }).then(r => r.data);

export const companyProfileApi = {
  get: () => get("/company-profile"),
  save: (值: Record<string, string>) => put("/company-profile", 值),
};

export const featureSettingsApi = {
  get: () => get("/feature-settings"),
  save: (值: Record<string, string>) => put("/feature-settings", 值),
};
