import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import MasterRouter from "./pages/master/MasterRouter";
import Dashboard from "./pages/Dashboard";
import StyleDetailPage from "./pages/styles/StyleDetailPage";
import BomSetupPage from "./pages/styles/BomSetupPage";
import OrdersPage from "./pages/orders/OrdersPage";
import ProductionNoticePage from "./pages/production/ProductionNoticePage";
import ProductionQueryPage from "./pages/production/ProductionQueryPage";
import ProductionTrackingPage from "./pages/production/ProductionTrackingPage";
import BomMaterialQueryPage from "./pages/production/BomMaterialQueryPage";
import BomStyleQueryPage from "./pages/production/BomStyleQueryPage";
import OrderSummaryPage from "./pages/production/OrderSummaryPage";
import PurchaseOverQueryPage from "./pages/production/PurchaseOverQueryPage";
import IssueOverQueryPage from "./pages/production/IssueOverQueryPage";
import MaterialUsageQueryPage from "./pages/production/MaterialUsageQueryPage";
import PurchaseAnalysisQueryPage from "./pages/production/PurchaseAnalysisQueryPage";
import PurchaseMaterialAnalysisPage from "./pages/production/PurchaseMaterialAnalysisPage";
import MaterialOrderMakePage from "./pages/production/MaterialOrderMakePage";
import PurchaseOrderListPage from "./pages/production/PurchaseOrderListPage";
import PurchaseOrderQueryPage from "./pages/production/PurchaseOrderQueryPage";
import OrderProgressPage from "./pages/production/OrderProgressPage";
import ProgressDetailPage from "./pages/production/ProgressDetailPage";
import MaterialDocRouter from "./pages/materials/MaterialDocRouter";
import MaterialMasterPage from "./pages/materials/MaterialMasterPage";
import PlasticMaterialMasterPage from "./pages/plastics/PlasticMaterialMasterPage";
import PlasticCommonMaterialPage from "./pages/plastics/PlasticCommonMaterialPage";
import PlasticMaterialAnalysisPage from "./pages/plastics/PlasticMaterialAnalysisPage";
import PlasticInventoryPage from "./pages/plastics/PlasticInventoryPage";
import PlasticInOutReportPage from "./pages/plastics/PlasticInOutReportPage";
import PlasticAnalysisDetailPage from "./pages/plastics/PlasticAnalysisDetailPage";
import PlasticOrderMakePage from "./pages/plastics/PlasticOrderMakePage";
import PlasticCustomerTypeStatsPage from "./pages/plastics/PlasticCustomerTypeStatsPage";
import PlasticRawMaterialSummaryPage from "./pages/plastics/PlasticRawMaterialSummaryPage";
import PlasticOrderQueryPage from "./pages/plastics/PlasticOrderQueryPage";
import PlasticIssueQueryPage from "./pages/plastics/PlasticIssueQueryPage";
import PlasticReturnQueryPage from "./pages/plastics/PlasticReturnQueryPage";
import PlasticScrapQueryPage from "./pages/plastics/PlasticScrapQueryPage";
import PlasticReceiptQueryPage from "./pages/plastics/PlasticReceiptQueryPage";
import PlasticWarehouseReturnQueryPage from "./pages/plastics/PlasticWarehouseReturnQueryPage";
import PlasticStocktakeQueryPage from "./pages/plastics/PlasticStocktakeQueryPage";
import PlasticLabelQueryPage from "./pages/plastics/PlasticLabelQueryPage";
import PlasticStocktakePage from "./pages/plastics/PlasticStocktakePage";
import PlasticIssueFormPage from "./pages/plastics/PlasticIssueFormPage";
import PlasticSupplierDocFormPage from "./pages/plastics/PlasticSupplierDocFormPage";
import PlasticReceiptFormPage from "./pages/plastics/PlasticReceiptFormPage";
import { PLASTIC_SUPPLIER_DOC_CONFIGS } from "./pages/plastics/PlasticSupplierDocConfigs";
import { PLASTIC_RECEIPT_FORM_CONFIGS } from "./pages/plastics/PlasticReceiptFormConfigs";
import MaterialInventoryPage from "./pages/materials/MaterialInventoryPage";
import MaterialLabelQueryPage from "./pages/materials/MaterialLabelQueryPage";
import PurchaseReceiptQueryPage from "./pages/materials/PurchaseReceiptQueryPage";
import PurchaseReturnQueryPage from "./pages/materials/PurchaseReturnQueryPage";
import MaterialIssueQueryPage from "./pages/materials/MaterialIssueQueryPage";
import MaterialReturnQueryPage from "./pages/materials/MaterialReturnQueryPage";
import MaterialScrapQueryPage from "./pages/materials/MaterialScrapQueryPage";
import MaterialStocktakeQueryPage from "./pages/materials/MaterialStocktakeQueryPage";
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
import MaterialStocktakePage from "./pages/materials/MaterialStocktakePage";
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
import DailyPage from "./pages/attendance/DailyPage";
import SysConfigPage from "./pages/system/SysConfigPage";
import AccountPage from "./pages/admin/AccountPage";
import PlaceholderPage from "./pages/PlaceholderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><PermissionProvider><MainLayout /></PermissionProvider></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="master/:menu" element={<MasterRouter />} />
          <Route path="styles/:styleNo" element={<StyleDetailPage />} />
          <Route path="bom-setup" element={<BomSetupPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="production" element={<ProductionNoticePage />} />
          <Route path="production-query" element={<ProductionQueryPage />} />
          <Route path="production-tracking" element={<ProductionTrackingPage />} />
          <Route path="bom-material-query" element={<BomMaterialQueryPage />} />
          <Route path="bom-style-query" element={<BomStyleQueryPage />} />
          <Route path="order-summary" element={<OrderSummaryPage />} />
          <Route path="purchase-over-query" element={<PurchaseOverQueryPage />} />
          <Route path="issue-over-query" element={<IssueOverQueryPage />} />
          <Route path="material-usage-query" element={<MaterialUsageQueryPage />} />
          <Route path="purchase-analysis-query" element={<PurchaseAnalysisQueryPage />} />
          <Route path="purchase-material-analysis" element={<PurchaseMaterialAnalysisPage />} />
          <Route path="material-order-make" element={<MaterialOrderMakePage />} />
          <Route path="purchase-orders" element={<PurchaseOrderListPage />} />
          <Route path="purchase-order-query" element={<PurchaseOrderQueryPage />} />
          <Route path="order-progress" element={<OrderProgressPage />} />
          <Route path="order-progress-detail" element={<ProgressDetailPage />} />
          <Route path="materials/:doc" element={<MaterialDocRouter />} />
          <Route path="material-master" element={<MaterialMasterPage />} />
          <Route path="plastic-material-master" element={<PlasticMaterialMasterPage />} />
          <Route path="plastic-common-materials" element={<PlasticCommonMaterialPage />} />
          <Route path="plastic-material-analysis" element={<PlasticMaterialAnalysisPage />} />
          <Route path="plastic-receipts" element={<PlasticReceiptFormPage cfg={PLASTIC_RECEIPT_FORM_CONFIGS["plastic-receipts"]} />} />
          <Route path="plastic-issues" element={<PlasticIssueFormPage />} />
          <Route path="plastic-returns" element={<PlasticSupplierDocFormPage cfg={PLASTIC_SUPPLIER_DOC_CONFIGS["plastic-returns"]} />} />
          <Route path="plastic-warehouse-returns" element={<PlasticReceiptFormPage cfg={PLASTIC_RECEIPT_FORM_CONFIGS["plastic-warehouse-returns"]} />} />
          <Route path="plastic-scraps" element={<PlasticSupplierDocFormPage cfg={PLASTIC_SUPPLIER_DOC_CONFIGS["plastic-scraps"]} />} />
          <Route path="plastic-stocktakes" element={<PlasticStocktakePage />} />
          <Route path="plastic-inventory" element={<PlasticInventoryPage />} />
          <Route path="plastic-in-out" element={<PlasticInOutReportPage />} />
          <Route path="plastic-analysis-detail" element={<PlasticAnalysisDetailPage />} />
          <Route path="plastic-order-make" element={<PlasticOrderMakePage />} />
          <Route path="plastic-customer-type-stats" element={<PlasticCustomerTypeStatsPage />} />
          <Route path="plastic-raw-material-summary" element={<PlasticRawMaterialSummaryPage />} />
          <Route path="plastic-order-query" element={<PlasticOrderQueryPage />} />
          <Route path="plastic-issue-query" element={<PlasticIssueQueryPage />} />
          <Route path="plastic-return-query" element={<PlasticReturnQueryPage />} />
          <Route path="plastic-scrap-query" element={<PlasticScrapQueryPage />} />
          <Route path="plastic-receipt-query" element={<PlasticReceiptQueryPage />} />
          <Route path="plastic-warehouse-return-query" element={<PlasticWarehouseReturnQueryPage />} />
          <Route path="plastic-stocktake-query" element={<PlasticStocktakeQueryPage />} />
          <Route path="plastic-label-query" element={<PlasticLabelQueryPage />} />
          <Route path="material-inventory" element={<MaterialInventoryPage />} />
          <Route path="material-label-query" element={<MaterialLabelQueryPage />} />
          <Route path="purchase-receipt-query" element={<PurchaseReceiptQueryPage />} />
          <Route path="purchase-return-query" element={<PurchaseReturnQueryPage />} />
          <Route path="material-issue-query" element={<MaterialIssueQueryPage />} />
          <Route path="material-return-query" element={<MaterialReturnQueryPage />} />
          <Route path="material-scrap-query" element={<MaterialScrapQueryPage />} />
          <Route path="material-stocktake-query" element={<MaterialStocktakeQueryPage />} />
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
          <Route path="materials/material-stocktake" element={<MaterialStocktakePage />} />
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
          <Route path="attendance/daily" element={<DailyPage />} />
          <Route path="sys-config" element={<SysConfigPage />} />
          <Route path="admin/accounts" element={<AccountPage />} />
          <Route path="_todo/:name" element={<PlaceholderPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
