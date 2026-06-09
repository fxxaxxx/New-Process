import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import MasterRouter from "./pages/master/MasterRouter";
import Dashboard from "./pages/Dashboard";
import StyleDetailPage from "./pages/styles/StyleDetailPage";
import OrdersPage from "./pages/orders/OrdersPage";
import ProductionPage from "./pages/production/ProductionPage";
import MaterialDocRouter from "./pages/materials/MaterialDocRouter";
import MaterialInventoryPage from "./pages/materials/MaterialInventoryPage";
import CuttingPage from "./pages/workshop/CuttingPage";
import PieceworkPage from "./pages/workshop/PieceworkPage";
import PieceworkSummaryPage from "./pages/workshop/PieceworkSummaryPage";
import OutsourcePage from "./pages/workshop/OutsourcePage";
import OutsourceReturnPage from "./pages/workshop/OutsourceReturnPage";
import OutsourceReconcilePage from "./pages/workshop/OutsourceReconcilePage";
import FinishedReceiptPage from "./pages/warehouse/FinishedReceiptPage";
import FinishedIssuePage from "./pages/warehouse/FinishedIssuePage";
import FinishedStocktakePage from "./pages/warehouse/FinishedStocktakePage";
import FinishedInventoryPage from "./pages/warehouse/FinishedInventoryPage";
import FinishedTransferPage from "./pages/warehouse/FinishedTransferPage";
import FinishedSalesReturnPage from "./pages/warehouse/FinishedSalesReturnPage";
import FinishedVendorReturnPage from "./pages/warehouse/FinishedVendorReturnPage";
import SemiReceiptPage from "./pages/warehouse/SemiReceiptPage";
import SemiIssuePage from "./pages/warehouse/SemiIssuePage";
import SemiStocktakePage from "./pages/warehouse/SemiStocktakePage";
import SemiInventoryPage from "./pages/warehouse/SemiInventoryPage";
import MonthEnd from "./pages/warehouse/MonthEnd";
import SalesShipmentPage from "./pages/sales/SalesShipmentPage";
import SalesReturnPage from "./pages/sales/SalesReturnPage";
import SalesReceiptPage from "./pages/sales/SalesReceiptPage";
import ReceivablesPage from "./pages/sales/ReceivablesPage";
import PurchasePaymentPage from "./pages/payables/PurchasePaymentPage";
import OutsourcePaymentPage from "./pages/payables/OutsourcePaymentPage";
import PayablesPage from "./pages/payables/PayablesPage";
import PieceworkPayrollPage from "./pages/payroll/PieceworkPayrollPage";
import AbsencePage from "./pages/payroll/AbsencePage";
import AttendancePage from "./pages/payroll/AttendancePage";
import WageTemplatePage from "./pages/payroll/WageTemplatePage";
import PayrollRunPage from "./pages/payroll/PayrollRunPage";
import ShiftPage from "./pages/attendance/ShiftPage";
import RosterPage from "./pages/attendance/RosterPage";
import SysConfigPage from "./pages/system/SysConfigPage";
import AccountPage from "./pages/admin/AccountPage";

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
          <Route path="production" element={<ProductionPage />} />
          <Route path="materials/:doc" element={<MaterialDocRouter />} />
          <Route path="material-inventory" element={<MaterialInventoryPage />} />
          <Route path="cuttings" element={<CuttingPage />} />
          <Route path="piecework" element={<PieceworkPage />} />
          <Route path="piecework-summary" element={<PieceworkSummaryPage />} />
          <Route path="outsourcing" element={<OutsourcePage />} />
          <Route path="outsourcing-returns" element={<OutsourceReturnPage />} />
          <Route path="outsourcing-reconcile" element={<OutsourceReconcilePage />} />
          <Route path="finished-receipts" element={<FinishedReceiptPage />} />
          <Route path="finished-issues" element={<FinishedIssuePage />} />
          <Route path="finished-stocktakes" element={<FinishedStocktakePage />} />
          <Route path="finished-inventory" element={<FinishedInventoryPage />} />
          <Route path="finished-transfers" element={<FinishedTransferPage />} />
          <Route path="finished-sales-returns" element={<FinishedSalesReturnPage />} />
          <Route path="finished-vendor-returns" element={<FinishedVendorReturnPage />} />
          <Route path="semi-receipts" element={<SemiReceiptPage />} />
          <Route path="semi-issues" element={<SemiIssuePage />} />
          <Route path="semi-stocktakes" element={<SemiStocktakePage />} />
          <Route path="semi-inventory" element={<SemiInventoryPage />} />
          <Route path="month-end" element={<MonthEnd />} />
          <Route path="sales-shipments" element={<SalesShipmentPage />} />
          <Route path="sales-returns" element={<SalesReturnPage />} />
          <Route path="sales-receipts" element={<SalesReceiptPage />} />
          <Route path="receivables" element={<ReceivablesPage />} />
          <Route path="purchase-payments" element={<PurchasePaymentPage />} />
          <Route path="outsource-payments" element={<OutsourcePaymentPage />} />
          <Route path="payables" element={<PayablesPage />} />
          <Route path="payroll/piecework" element={<PieceworkPayrollPage />} />
          <Route path="payroll/absences" element={<AbsencePage />} />
          <Route path="payroll/attendance" element={<AttendancePage />} />
          <Route path="payroll/wage-templates" element={<WageTemplatePage />} />
          <Route path="payroll/wages" element={<PayrollRunPage />} />
          <Route path="attendance/shifts" element={<ShiftPage />} />
          <Route path="attendance/rosters" element={<RosterPage />} />
          <Route path="sys-config" element={<SysConfigPage />} />
          <Route path="admin/accounts" element={<AccountPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
