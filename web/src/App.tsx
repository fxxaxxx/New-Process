import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import MasterRouter from "./pages/master/MasterRouter";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><PermissionProvider><MainLayout /></PermissionProvider></RequireAuth>}>
          <Route index element={
            <div style={{ background: "#fff", borderRadius: 8, padding: 40, minHeight: 240 }}>
              <h2 style={{ marginTop: 0 }}>欢迎使用 兴信B ERP</h2>
              <p style={{ color: "rgba(0,0,0,0.65)", marginBottom: 4 }}>服装 / 塑胶一体化生产管理系统 · 净室重建版</p>
              <p style={{ color: "rgba(0,0,0,0.45)" }}>请从左侧「基础资料」选择要维护的主数据（客户 / 供应商 / 物料 / 报价 等）。</p>
            </div>
          } />
          <Route path="master/:menu" element={<MasterRouter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
