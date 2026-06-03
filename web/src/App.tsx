import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import MasterRouter from "./pages/master/MasterRouter";
import Dashboard from "./pages/Dashboard";
import StyleDetailPage from "./pages/styles/StyleDetailPage";
import OrdersPage from "./pages/orders/OrdersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><PermissionProvider><MainLayout /></PermissionProvider></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="master/:menu" element={<MasterRouter />} />
          <Route path="styles/:styleNo" element={<StyleDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
