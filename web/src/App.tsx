import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import MasterRouter from "./pages/master/MasterRouter";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<PermissionProvider><MainLayout /></PermissionProvider>}>
          <Route index element={<div>欢迎使用兴信B ERP</div>} />
          <Route path="master/:menu" element={<MasterRouter />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
