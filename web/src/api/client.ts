import axios from "axios";

export const api = axios.create({ baseURL: "http://localhost:5000/api" });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("erp_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export async function login(用户: string, 密码: string) {
  const { data } = await api.post("/auth/login", { 用户, 密码 });
  if (data.令牌) localStorage.setItem("erp_token", data.令牌);
  return data as { 成功: boolean; 令牌?: string; 消息?: string };
}
