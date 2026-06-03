import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

// 没有令牌就跳登录页(避免直接落到空壳)
export default function RequireAuth({ children }: { children: ReactNode }) {
  const token = localStorage.getItem("erp_token");
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}
