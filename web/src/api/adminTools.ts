import { api } from "./client";

// 系统工具:版本信息(网上升级) + 数据库备份(备份数据)
export interface VersionInfo { 版本?: string; 信息版本?: string; 框架?: string; 环境?: string }
export interface BackupResult { 文件?: string; 消息?: string }

export const adminToolsApi = {
  version: () => api.get<VersionInfo>("/admin/version").then(r => r.data),
  backup: () => api.post<BackupResult>("/admin/backup").then(r => r.data),
};
