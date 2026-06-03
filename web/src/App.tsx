import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PermissionProvider><MainLayout /></PermissionProvider>}>
          <Route index element={<div>欢迎使用兴信B ERP（P0 地基已就绪）</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
