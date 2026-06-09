import { api } from "./client";

export interface SysConfigRow { 键?: string; 值?: string | null; 是否加密: boolean; 备注?: string }
export interface SysConfigSave { 键: string; 值?: string; 是否加密: boolean; 备注?: string }

const enc = encodeURIComponent;

export const sysConfigApi = {
  list: (keyword = "") => api.get<SysConfigRow[]>("/sys-config", { params: { keyword } }).then(r => r.data),
  get: (键: string) => api.get<SysConfigRow>(`/sys-config/${enc(键)}`).then(r => r.data),
  upsert: (body: SysConfigSave) => api.post<{ 键: string }>("/sys-config", body).then(r => r.data),
  remove: (键: string) => api.delete(`/sys-config/${enc(键)}`),
};
