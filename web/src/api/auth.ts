import { api } from "./client";

export const authApi = {
  changePassword: (body: { 原密码: string; 新密码: string }) =>
    api.post<{ 消息?: string }>("/auth/change-password", body).then(r => r.data),
};
