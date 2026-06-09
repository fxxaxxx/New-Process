import axios from "axios";

export const api = axios.create({ baseURL: "http://localhost:5000/api" });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("erp_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

// 令牌失效(401)自动清除并回登录页
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("erp_token");
      localStorage.removeItem("erp_user");
      if (window.location.pathname !== "/login") window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export async function login(用户: string, 密码: string) {
  const { data } = await api.post("/auth/login", { 用户, 密码 });
  if (data.令牌) { localStorage.setItem("erp_token", data.令牌); localStorage.setItem("erp_user", 用户); }
  return data as { 成功: boolean; 令牌?: string; 消息?: string };
}
