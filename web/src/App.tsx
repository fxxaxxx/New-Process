import { lazy, Suspense } from "react";
import { Spin } from "antd";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import MasterRouter from "./pages/master/MasterRouter";
import Dashboard from "./pages/Dashboard";
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const CompanyProfilePage = lazy(() => import("./pages/system/CompanyProfilePage"));
const FeatureSettingsPage = lazy(() => import("./pages/system/FeatureSettingsPage"));
const WarehouseLocationPage = lazy(() => import("./pages/system/WarehouseLocationPage"));
const InjectionMachineRatePage = lazy(() => import("./pages/system/InjectionMachineRatePage"));
const BackupPage = lazy(() => import("./pages/system/BackupPage"));
const RestorePage = lazy(() => import("./pages/system/RestorePage"));
const UpgradePage = lazy(() => import("./pages/system/UpgradePage"));
const LogoutPage = lazy(() => import("./pages/system/LogoutPage"));
const FinishedLeftoverPage = lazy(() => import("./pages/production/FinishedLeftoverPage"));
const ContractLeftoverPage = lazy(() => import("./pages/production/ContractLeftoverPage"));
const ProcessShortagePage = lazy(() => import("./pages/assembly/ProcessShortagePage"));
const FactoryCategoryDetailPage = lazy(() => import("./pages/assembly/FactoryCategoryDetailPage"));
const PlasticMonthlyReportPage = lazy(() => import("./pages/plastics/PlasticMonthlyReportPage"));
const PlasticInOutSummaryPage = lazy(() => import("./pages/plastics/PlasticInOutSummaryPage"));
const PlasticPurchaseProgressDetailPage = lazy(() => import("./pages/plastics/PlasticPurchaseProgressDetailPage"));
const PlasticRawMaterialPurchaseProgressPage = lazy(() => import("./pages/plastics/PlasticRawMaterialPurchaseProgressPage"));
const PlasticRawMaterialIssueProgressPage = lazy(() => import("./pages/plastics/PlasticRawMaterialIssueProgressPage"));
const PlasticLabelOrderPage = lazy(() => import("./pages/plastics/PlasticLabelOrderPage"));
const PlasticMaterialSettingsPage = lazy(() => import("./pages/plastics/PlasticMaterialSettingsPage"));
const MaterialLabelOrderPage = lazy(() => import("./pages/materials/MaterialLabelOrderPage"));
const PurchaseMaterialSettingsPage = lazy(() => import("./pages/production/PurchaseMaterialSettingsPage"));
const StyleDetailPage = lazy(() => import("./pages/styles/StyleDetailPage"));
const BomSetupPage = lazy(() => import("./pages/styles/BomSetupPage"));
const SemiFinishedCommonMaterialsPage = lazy(() => import("./pages/semi/SemiFinishedCommonMaterialsPage"));
const SemiFinishedLabelOrderPage = lazy(() => import("./pages/semi/SemiFinishedLabelOrderPage"));
const SemiFinishedShortageAnalysisPage = lazy(() => import("./pages/semi/SemiFinishedShortageAnalysisPage"));
const AssemblyFactoryInventoryPage = lazy(() => import("./pages/assembly/AssemblyFactoryInventoryPage"));
const AssemblyFactoryCategoryMonthlyPage = lazy(() => import("./pages/assembly/AssemblyFactoryCategoryMonthlyPage"));
const AssemblyMaterialSummaryPage = lazy(() => import("./pages/assembly/AssemblyMaterialSummaryPage"));
const AssemblyMaterialTrackingPage = lazy(() => import("./pages/assembly/AssemblyMaterialTrackingPage"));
const AssemblyPurchaseOrderPage = lazy(() => import("./pages/assembly/AssemblyPurchaseOrderPage"));
const AssemblyPurchaseProgressPage = lazy(() => import("./pages/assembly/AssemblyPurchaseProgressPage"));
const AssemblyPurchaseQueryPage = lazy(() => import("./pages/assembly/AssemblyPurchaseQueryPage"));
const AssemblyRequiredMaterialDetailPage = lazy(() => import("./pages/assembly/AssemblyRequiredMaterialDetailPage"));
const OrdersPage = lazy(() => import("./pages/orders/OrdersPage"));
const ProductionNoticePage = lazy(() => import("./pages/production/ProductionNoticePage"));
const ProductionQueryPage = lazy(() => import("./pages/production/ProductionQueryPage"));
const ProductionTrackingPage = lazy(() => import("./pages/production/ProductionTrackingPage"));
const BomMaterialQueryPage = lazy(() => import("./pages/production/BomMaterialQueryPage"));
const BomStyleQueryPage = lazy(() => import("./pages/production/BomStyleQueryPage"));
const OrderSummaryPage = lazy(() => import("./pages/production/OrderSummaryPage"));
const PurchaseOverQueryPage = lazy(() => import("./pages/production/PurchaseOverQueryPage"));
const IssueOverQueryPage = lazy(() => import("./pages/production/IssueOverQueryPage"));
const MaterialUsageQueryPage = lazy(() => import("./pages/production/MaterialUsageQueryPage"));
const PurchaseAnalysisQueryPage = lazy(() => import("./pages/production/PurchaseAnalysisQueryPage"));
const PurchaseIssueAnalysisPage = lazy(() => import("./pages/production/PurchaseIssueAnalysisPage"));
const PurchaseMaterialAnalysisPage = lazy(() => import("./pages/production/PurchaseMaterialAnalysisPage"));
const MaterialOrderMakePage = lazy(() => import("./pages/production/MaterialOrderMakePage"));
const PurchaseOrderListPage = lazy(() => import("./pages/production/PurchaseOrderListPage"));
const PurchaseOrderQueryPage = lazy(() => import("./pages/production/PurchaseOrderQueryPage"));
const OrderProgressPage = lazy(() => import("./pages/production/OrderProgressPage"));
const ProgressDetailPage = lazy(() => import("./pages/production/ProgressDetailPage"));
const MaterialDocRouter = lazy(() => import("./pages/materials/MaterialDocRouter"));
const MaterialMasterPage = lazy(() => import("./pages/materials/MaterialMasterPage"));
const AuxiliaryMaterialMasterPage = lazy(() => import("./pages/auxiliary/AuxiliaryMaterialMasterPage"));
const AuxiliaryPurchaseAnalysisPage = lazy(() => import("./pages/auxiliary/AuxiliaryPurchaseAnalysisPage"));
const AuxiliaryPurchaseOrderPage = lazy(() => import("./pages/auxiliary/AuxiliaryPurchaseOrderPage"));
const AuxiliaryPurchaseProgressPage = lazy(() => import("./pages/auxiliary/AuxiliaryPurchaseProgressPage"));
const AuxiliaryIssueProgressPage = lazy(() => import("./pages/auxiliary/AuxiliaryIssueProgressPage"));
const AuxiliaryInventoryPage = lazy(() => import("./pages/auxiliary/AuxiliaryInventoryPage"));
const AuxiliaryMonthlyPage = lazy(() => import("./pages/auxiliary/AuxiliaryMonthlyPage"));
const AuxiliaryOrderReceiptStatsPage = lazy(() => import("./pages/auxiliary/AuxiliaryOrderReceiptStatsPage"));
const AuxiliaryProgressDetailPage = lazy(() => import("./pages/auxiliary/AuxiliaryProgressDetailPage"));
const AuxiliaryIssueDetailPage = lazy(() => import("./pages/auxiliary/AuxiliaryIssueDetailPage"));
const AuxiliaryPurchaseOrderQueryPage = lazy(() => import("./pages/auxiliary/AuxiliaryPurchaseOrderQueryPage"));
const AuxiliaryReceiptQueryPage = lazy(() => import("./pages/auxiliary/AuxiliaryReceiptQueryPage"));
const AuxiliaryStockIssueQueryPage = lazy(() => import("./pages/auxiliary/AuxiliaryStockIssueQueryPage"));
const AuxiliaryStockReturnQueryPage = lazy(() => import("./pages/auxiliary/AuxiliaryStockReturnQueryPage"));
const AuxiliaryStocktakeQueryPage = lazy(() => import("./pages/auxiliary/AuxiliaryStocktakeQueryPage"));
const AuxiliaryReceiptPage = lazy(() => import("./pages/auxiliary/AuxiliaryReceiptPage"));
const AuxiliaryPurchaseReturnPage = lazy(() => import("./pages/auxiliary/AuxiliaryPurchaseReturnPage"));
const AuxiliaryIssuePage = lazy(() => import("./pages/auxiliary/AuxiliaryIssuePage"));
const AuxiliaryReturnPage = lazy(() => import("./pages/auxiliary/AuxiliaryReturnPage"));
const AuxiliaryStocktakePage = lazy(() => import("./pages/auxiliary/AuxiliaryStocktakePage"));
const PlasticMaterialMasterPage = lazy(() => import("./pages/plastics/PlasticMaterialMasterPage"));
const PlasticRawMaterialMasterPage = lazy(() => import("./pages/plastics/PlasticRawMaterialMasterPage"));
const PlasticCommonMaterialPage = lazy(() => import("./pages/plastics/PlasticCommonMaterialPage"));
const PlasticMoldPage = lazy(() => import("./pages/plastics/PlasticMoldPage"));
const PlasticMaterialAnalysisPage = lazy(() => import("./pages/plastics/PlasticMaterialAnalysisPage"));
const PlasticInventoryPage = lazy(() => import("./pages/plastics/PlasticInventoryPage"));
const PlasticInOutReportPage = lazy(() => import("./pages/plastics/PlasticInOutReportPage"));
const PlasticAnalysisDetailPage = lazy(() => import("./pages/plastics/PlasticAnalysisDetailPage"));
const PlasticOrderMakePage = lazy(() => import("./pages/plastics/PlasticOrderMakePage"));
const PlasticProcessOrderMakePage = lazy(() => import("./pages/plastics/PlasticProcessOrderMakePage"));
const PlasticCustomerTypeStatsPage = lazy(() => import("./pages/plastics/PlasticCustomerTypeStatsPage"));
const PlasticRawMaterialInventoryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialInventoryPage"));
const PlasticRawMaterialMonthlyPage = lazy(() => import("./pages/plastics/PlasticRawMaterialMonthlyPage"));
const PlasticRawMaterialSummaryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialSummaryPage"));
const PlasticRawMaterialOrderReceiptStatsPage = lazy(() => import("./pages/plastics/PlasticRawMaterialOrderReceiptStatsPage"));
const PlasticRawMaterialProgressDetailPage = lazy(() => import("./pages/plastics/PlasticRawMaterialProgressDetailPage"));
const PlasticRawMaterialIssueProgressDetailPage = lazy(() => import("./pages/plastics/PlasticRawMaterialIssueProgressDetailPage"));
const PlasticRawMaterialOutsourceShortagePage = lazy(() => import("./pages/plastics/PlasticRawMaterialOutsourceShortagePage"));
const PlasticRawMaterialPurchaseOrderQueryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialPurchaseOrderQueryPage"));
const PlasticRawMaterialReceiptQueryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialReceiptQueryPage"));
const PlasticRawMaterialReturnQueryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialReturnQueryPage"));
const PlasticRawMaterialStockIssueQueryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialStockIssueQueryPage"));
const PlasticRawMaterialStockReturnQueryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialStockReturnQueryPage"));
const PlasticRawMaterialStocktakeQueryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialStocktakeQueryPage"));
const PlasticOrderQueryPage = lazy(() => import("./pages/plastics/PlasticOrderQueryPage"));
const PlasticIssueQueryPage = lazy(() => import("./pages/plastics/PlasticIssueQueryPage"));
const PlasticReturnQueryPage = lazy(() => import("./pages/plastics/PlasticReturnQueryPage"));
const PlasticScrapQueryPage = lazy(() => import("./pages/plastics/PlasticScrapQueryPage"));
const PlasticReceiptQueryPage = lazy(() => import("./pages/plastics/PlasticReceiptQueryPage"));
const PlasticWarehouseReturnQueryPage = lazy(() => import("./pages/plastics/PlasticWarehouseReturnQueryPage"));
const PlasticStocktakeQueryPage = lazy(() => import("./pages/plastics/PlasticStocktakeQueryPage"));
const PlasticLabelQueryPage = lazy(() => import("./pages/plastics/PlasticLabelQueryPage"));
const PlasticStocktakePage = lazy(() => import("./pages/plastics/PlasticStocktakePage"));
const PlasticIssueFormPage = lazy(() => import("./pages/plastics/PlasticIssueFormPage"));
const PlasticSupplierDocFormPage = lazy(() => import("./pages/plastics/PlasticSupplierDocFormPage"));
const PlasticReceiptFormPage = lazy(() => import("./pages/plastics/PlasticReceiptFormPage"));
const PlasticPurchaseProgressPage = lazy(() => import("./pages/plastics/PlasticPurchaseProgressPage"));
const PlasticPurchaseOrderPage = lazy(() => import("./pages/plastics/PlasticPurchaseOrderPage"));
const PlasticProcessPurchaseOrderPage = lazy(() => import("./pages/plastics/PlasticProcessPurchaseOrderPage"));
const PlasticProcessPurchaseQueryPage = lazy(() => import("./pages/plastics/PlasticProcessPurchaseQueryPage"));
const PlasticProcessPurchaseProgressPage = lazy(() => import("./pages/plastics/PlasticProcessPurchaseProgressPage"));
const PlasticProcessPurchaseDetailPage = lazy(() => import("./pages/plastics/PlasticProcessPurchaseDetailPage"));
const PlasticProcessIssueProgressPage = lazy(() => import("./pages/plastics/PlasticProcessIssueProgressPage"));
const PlasticProcessShortagePage = lazy(() => import("./pages/plastics/PlasticProcessShortagePage"));
const PlasticWhitePartIssuePage = lazy(() => import("./pages/plastics/PlasticWhitePartIssuePage"));
const PlasticRawMaterialDemandPage = lazy(() => import("./pages/plastics/PlasticRawMaterialDemandPage"));
const PlasticRawMaterialDemandSummaryPage = lazy(() => import("./pages/plastics/PlasticRawMaterialDemandSummaryPage"));
const PlasticRawMaterialPurchaseAnalysisPage = lazy(() => import("./pages/plastics/PlasticRawMaterialPurchaseAnalysisPage"));
const PlasticRawMaterialPurchaseOrderPage = lazy(() => import("./pages/plastics/PlasticRawMaterialPurchaseOrderPage"));
const PlasticRawMaterialReceiptPage = lazy(() => import("./pages/plastics/PlasticRawMaterialReceiptPage"));
const PlasticRawMaterialReturnPage = lazy(() => import("./pages/plastics/PlasticRawMaterialReturnPage"));
const PlasticRawMaterialStockReturnPage = lazy(() => import("./pages/plastics/PlasticRawMaterialStockReturnPage"));
const PlasticRawMaterialStockIssuePage = lazy(() => import("./pages/plastics/PlasticRawMaterialStockIssuePage"));
const PlasticRawMaterialStocktakePage = lazy(() => import("./pages/plastics/PlasticRawMaterialStocktakePage"));
import { PLASTIC_SUPPLIER_DOC_CONFIGS } from "./pages/plastics/PlasticSupplierDocConfigs";
import { PLASTIC_RECEIPT_FORM_CONFIGS } from "./pages/plastics/PlasticReceiptFormConfigs";
const MaterialInventoryPage = lazy(() => import("./pages/materials/MaterialInventoryPage"));
const MaterialLabelQueryPage = lazy(() => import("./pages/materials/MaterialLabelQueryPage"));
const PurchaseReceiptQueryPage = lazy(() => import("./pages/materials/PurchaseReceiptQueryPage"));
const PurchaseReturnQueryPage = lazy(() => import("./pages/materials/PurchaseReturnQueryPage"));
const MaterialIssueQueryPage = lazy(() => import("./pages/materials/MaterialIssueQueryPage"));
const MaterialReturnQueryPage = lazy(() => import("./pages/materials/MaterialReturnQueryPage"));
const MaterialScrapQueryPage = lazy(() => import("./pages/materials/MaterialScrapQueryPage"));
const MaterialStocktakeQueryPage = lazy(() => import("./pages/materials/MaterialStocktakeQueryPage"));
const CuttingPage = lazy(() => import("./pages/workshop/CuttingPage"));
const PieceworkPage = lazy(() => import("./pages/workshop/PieceworkPage"));
const PieceworkSummaryPage = lazy(() => import("./pages/workshop/PieceworkSummaryPage"));
const OutsourcePage = lazy(() => import("./pages/workshop/OutsourcePage"));
const OutsourceReturnPage = lazy(() => import("./pages/workshop/OutsourceReturnPage"));
const OutsourceReconcilePage = lazy(() => import("./pages/workshop/OutsourceReconcilePage"));
const FinishedReceiptPage = lazy(() => import("./pages/warehouse/FinishedReceiptPage"));
const FinishedReceiptQueryPage = lazy(() => import("./pages/warehouse/FinishedReceiptQueryPage"));
const FinishedIssuePage = lazy(() => import("./pages/warehouse/FinishedIssuePage"));
const FinishedStocktakePage = lazy(() => import("./pages/warehouse/FinishedStocktakePage"));
const FinishedInventoryPage = lazy(() => import("./pages/warehouse/FinishedInventoryPage"));
const FinishedTransferPage = lazy(() => import("./pages/warehouse/FinishedTransferPage"));
const FinishedSalesReturnPage = lazy(() => import("./pages/warehouse/FinishedSalesReturnPage"));
const FinishedVendorReturnPage = lazy(() => import("./pages/warehouse/FinishedVendorReturnPage"));
const SemiReceiptPage = lazy(() => import("./pages/warehouse/SemiReceiptPage"));
const SemiWarehouseReturnPage = lazy(() => import("./pages/warehouse/SemiWarehouseReturnPage"));
const SemiIssuePage = lazy(() => import("./pages/warehouse/SemiIssuePage"));
const SemiStockReturnPage = lazy(() => import("./pages/warehouse/SemiStockReturnPage"));
const SemiScrapPage = lazy(() => import("./pages/warehouse/SemiScrapPage"));
const SemiStocktakePage = lazy(() => import("./pages/warehouse/SemiStocktakePage"));
const MaterialStocktakePage = lazy(() => import("./pages/materials/MaterialStocktakePage"));
const SemiInventoryPage = lazy(() => import("./pages/warehouse/SemiInventoryPage"));
const SemiMonthlyReportPage = lazy(() => import("./pages/warehouse/SemiMonthlyReportPage"));
const SemiLabelQueryPage = lazy(() => import("./pages/warehouse/SemiLabelQueryPage"));
const SemiReceiptQueryPage = lazy(() => import("./pages/warehouse/SemiReceiptQueryPage"));
const SemiWhReturnQueryPage = lazy(() => import("./pages/warehouse/SemiWhReturnQueryPage"));
const SemiIssueQueryPage = lazy(() => import("./pages/warehouse/SemiIssueQueryPage"));
const SemiStockReturnQueryPage = lazy(() => import("./pages/warehouse/SemiStockReturnQueryPage"));
const SemiScrapQueryPage = lazy(() => import("./pages/warehouse/SemiScrapQueryPage"));
const SemiStocktakeQueryPage = lazy(() => import("./pages/warehouse/SemiStocktakeQueryPage"));
const MonthEnd = lazy(() => import("./pages/warehouse/MonthEnd"));
const SalesShipmentPage = lazy(() => import("./pages/sales/SalesShipmentPage"));
const SalesReturnPage = lazy(() => import("./pages/sales/SalesReturnPage"));
const SalesReceiptPage = lazy(() => import("./pages/sales/SalesReceiptPage"));
const ReceivablesPage = lazy(() => import("./pages/sales/ReceivablesPage"));
const PurchasePaymentPage = lazy(() => import("./pages/payables/PurchasePaymentPage"));
const OutsourcePaymentPage = lazy(() => import("./pages/payables/OutsourcePaymentPage"));
const PayablesPage = lazy(() => import("./pages/payables/PayablesPage"));
const PieceworkPayrollPage = lazy(() => import("./pages/payroll/PieceworkPayrollPage"));
const AbsencePage = lazy(() => import("./pages/payroll/AbsencePage"));
const AttendancePage = lazy(() => import("./pages/payroll/AttendancePage"));
const WageTemplatePage = lazy(() => import("./pages/payroll/WageTemplatePage"));
const PayrollRunPage = lazy(() => import("./pages/payroll/PayrollRunPage"));
const ShiftPage = lazy(() => import("./pages/attendance/ShiftPage"));
const RosterPage = lazy(() => import("./pages/attendance/RosterPage"));
const DailyPage = lazy(() => import("./pages/attendance/DailyPage"));
const SysConfigPage = lazy(() => import("./pages/system/SysConfigPage"));
const DepartmentPersonnelPage = lazy(() => import("./pages/system/DepartmentPersonnelPage"));
const AccountPage = lazy(() => import("./pages/admin/AccountPage"));
import PlaceholderPage from "./pages/PlaceholderPage";

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ display: "grid", placeItems: "center", height: "100vh" }}><Spin size="large" /></div>}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RequireAuth><PermissionProvider><MainLayout /></PermissionProvider></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="master/:menu" element={<MasterRouter />} />
          <Route path="styles/:styleNo" element={<StyleDetailPage />} />
          <Route path="bom-setup" element={<BomSetupPage />} />
          <Route path="assembly-factory-inventory" element={<AssemblyFactoryInventoryPage />} />
          <Route path="assembly-factory-category-monthly" element={<AssemblyFactoryCategoryMonthlyPage />} />
          <Route path="assembly-material-setup" element={<BomSetupPage />} />
          <Route path="semi-finished-common-materials" element={<SemiFinishedCommonMaterialsPage />} />
          <Route path="semi-finished-label-orders" element={<SemiFinishedLabelOrderPage />} />
          <Route path="semi-finished-shortage-analysis" element={<SemiFinishedShortageAnalysisPage />} />
          <Route path="assembly-material-summary" element={<AssemblyMaterialSummaryPage />} />
          <Route path="assembly-material-tracking" element={<AssemblyMaterialTrackingPage />} />
          <Route path="assembly-purchase-orders" element={<AssemblyPurchaseOrderPage />} />
          <Route path="assembly-purchase-progress" element={<AssemblyPurchaseProgressPage />} />
          <Route path="assembly-purchase-query" element={<AssemblyPurchaseQueryPage />} />
          <Route path="assembly-required-material-detail" element={<AssemblyRequiredMaterialDetailPage />} />
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
          <Route path="purchase-issue-analysis" element={<PurchaseIssueAnalysisPage />} />
          <Route path="purchase-material-analysis" element={<PurchaseMaterialAnalysisPage />} />
          <Route path="material-order-make" element={<MaterialOrderMakePage />} />
          <Route path="purchase-orders" element={<PurchaseOrderListPage />} />
          <Route path="purchase-order-query" element={<PurchaseOrderQueryPage />} />
          <Route path="order-progress" element={<OrderProgressPage />} />
          <Route path="order-progress-detail" element={<ProgressDetailPage />} />
          <Route path="materials/:doc" element={<MaterialDocRouter />} />
          <Route path="material-master" element={<MaterialMasterPage />} />
          <Route path="auxiliary-material-master" element={<AuxiliaryMaterialMasterPage />} />
          <Route path="auxiliary-purchase-analysis" element={<AuxiliaryPurchaseAnalysisPage />} />
          <Route path="auxiliary-purchase-order" element={<AuxiliaryPurchaseOrderPage />} />
          <Route path="auxiliary-purchase-progress" element={<AuxiliaryPurchaseProgressPage />} />
          <Route path="auxiliary-issue-progress" element={<AuxiliaryIssueProgressPage />} />
          <Route path="auxiliary-inventory" element={<AuxiliaryInventoryPage />} />
          <Route path="auxiliary-monthly" element={<AuxiliaryMonthlyPage />} />
          <Route path="auxiliary-order-receipt-stats" element={<AuxiliaryOrderReceiptStatsPage />} />
          <Route path="auxiliary-progress-detail" element={<AuxiliaryProgressDetailPage />} />
          <Route path="auxiliary-issue-detail" element={<AuxiliaryIssueDetailPage />} />
          <Route path="auxiliary-purchase-order-query" element={<AuxiliaryPurchaseOrderQueryPage />} />
          <Route path="auxiliary-receipt-query" element={<AuxiliaryReceiptQueryPage />} />
          <Route path="auxiliary-stock-issue-query" element={<AuxiliaryStockIssueQueryPage />} />
          <Route path="auxiliary-stock-return-query" element={<AuxiliaryStockReturnQueryPage />} />
          <Route path="auxiliary-stocktake-query" element={<AuxiliaryStocktakeQueryPage />} />
          <Route path="auxiliary-receipts" element={<AuxiliaryReceiptPage />} />
          <Route path="auxiliary-purchase-returns" element={<AuxiliaryPurchaseReturnPage />} />
          <Route path="auxiliary-issues" element={<AuxiliaryIssuePage />} />
          <Route path="auxiliary-returns" element={<AuxiliaryReturnPage />} />
          <Route path="auxiliary-stocktakes" element={<AuxiliaryStocktakePage />} />
          <Route path="plastic-material-master" element={<PlasticMaterialMasterPage />} />
          <Route path="plastic-raw-material-master" element={<PlasticRawMaterialMasterPage />} />
          <Route path="plastic-common-materials" element={<PlasticCommonMaterialPage />} />
          <Route path="plastic-molds" element={<PlasticMoldPage />} />
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
          <Route path="plastic-process-order-make" element={<PlasticProcessOrderMakePage />} />
          <Route path="plastic-purchase-orders" element={<PlasticPurchaseOrderPage />} />
          <Route path="plastic-process-purchase-orders" element={<PlasticProcessPurchaseOrderPage />} />
          <Route path="plastic-process-purchase-query" element={<PlasticProcessPurchaseQueryPage />} />
          <Route path="plastic-process-purchase-progress" element={<PlasticProcessPurchaseProgressPage />} />
          <Route path="plastic-process-purchase-detail" element={<PlasticProcessPurchaseDetailPage />} />
          <Route path="plastic-process-issue-progress" element={<PlasticProcessIssueProgressPage />} />
          <Route path="plastic-process-shortage" element={<PlasticProcessShortagePage />} />
          <Route path="plastic-white-part-issue" element={<PlasticWhitePartIssuePage />} />
          <Route path="plastic-raw-material-demand" element={<PlasticRawMaterialDemandPage />} />
          <Route path="plastic-raw-material-demand-summary" element={<PlasticRawMaterialDemandSummaryPage />} />
          <Route path="plastic-raw-material-purchase-analysis" element={<PlasticRawMaterialPurchaseAnalysisPage />} />
          <Route path="plastic-raw-material-purchase-order" element={<PlasticRawMaterialPurchaseOrderPage />} />
          <Route path="plastic-raw-material-receipt" element={<PlasticRawMaterialReceiptPage />} />
          <Route path="plastic-raw-material-return" element={<PlasticRawMaterialReturnPage />} />
          <Route path="plastic-raw-material-stock-return" element={<PlasticRawMaterialStockReturnPage />} />
          <Route path="plastic-raw-material-stock-issue" element={<PlasticRawMaterialStockIssuePage />} />
          <Route path="plastic-raw-material-stocktake" element={<PlasticRawMaterialStocktakePage />} />
          <Route path="plastic-purchase-progress" element={<PlasticPurchaseProgressPage />} />
          <Route path="plastic-customer-type-stats" element={<PlasticCustomerTypeStatsPage />} />
          <Route path="plastic-raw-material-inventory" element={<PlasticRawMaterialInventoryPage />} />
          <Route path="plastic-raw-material-monthly" element={<PlasticRawMaterialMonthlyPage />} />
          <Route path="plastic-raw-material-order-receipt-stats" element={<PlasticRawMaterialOrderReceiptStatsPage />} />
          <Route path="plastic-raw-material-progress-detail" element={<PlasticRawMaterialProgressDetailPage />} />
          <Route path="plastic-raw-material-issue-progress-detail" element={<PlasticRawMaterialIssueProgressDetailPage />} />
          <Route path="plastic-raw-material-outsource-shortage" element={<PlasticRawMaterialOutsourceShortagePage />} />
          <Route path="plastic-raw-material-purchase-order-query" element={<PlasticRawMaterialPurchaseOrderQueryPage />} />
          <Route path="plastic-raw-material-receipt-query" element={<PlasticRawMaterialReceiptQueryPage />} />
          <Route path="plastic-raw-material-return-query" element={<PlasticRawMaterialReturnQueryPage />} />
          <Route path="plastic-raw-material-stock-issue-query" element={<PlasticRawMaterialStockIssueQueryPage />} />
          <Route path="plastic-raw-material-stock-return-query" element={<PlasticRawMaterialStockReturnQueryPage />} />
          <Route path="plastic-raw-material-stocktake-query" element={<PlasticRawMaterialStocktakeQueryPage />} />
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
          <Route path="finished-receipt-query" element={<FinishedReceiptQueryPage />} />
          <Route path="finished-issues" element={<FinishedIssuePage />} />
          <Route path="finished-stocktakes" element={<FinishedStocktakePage />} />
          <Route path="finished-inventory" element={<FinishedInventoryPage />} />
          <Route path="finished-transfers" element={<FinishedTransferPage />} />
          <Route path="finished-sales-returns" element={<FinishedSalesReturnPage />} />
          <Route path="finished-vendor-returns" element={<FinishedVendorReturnPage />} />
          <Route path="semi-receipts" element={<SemiReceiptPage />} />
          <Route path="semi-warehouse-returns" element={<SemiWarehouseReturnPage />} />
          <Route path="semi-issues" element={<SemiIssuePage />} />
          <Route path="semi-stock-returns" element={<SemiStockReturnPage />} />
          <Route path="semi-scraps" element={<SemiScrapPage />} />
          <Route path="semi-stocktakes" element={<SemiStocktakePage />} />
          <Route path="materials/material-stocktake" element={<MaterialStocktakePage />} />
          <Route path="semi-inventory" element={<SemiInventoryPage />} />
          <Route path="semi-inventory-monthly" element={<SemiMonthlyReportPage />} />
          <Route path="semi-label-query" element={<SemiLabelQueryPage />} />
          <Route path="semi-receipt-query" element={<SemiReceiptQueryPage />} />
          <Route path="semi-warehouse-return-query" element={<SemiWhReturnQueryPage />} />
          <Route path="semi-issue-query" element={<SemiIssueQueryPage />} />
          <Route path="semi-stock-return-query" element={<SemiStockReturnQueryPage />} />
          <Route path="semi-scrap-query" element={<SemiScrapQueryPage />} />
          <Route path="semi-stocktake-query" element={<SemiStocktakeQueryPage />} />
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
          <Route path="hr/department-personnel" element={<DepartmentPersonnelPage />} />
          <Route path="admin/accounts" element={<AccountPage />} />
          <Route path="change-password" element={<ChangePasswordPage />} />
          <Route path="system/company-profile" element={<CompanyProfilePage />} />
          <Route path="system/feature-settings" element={<FeatureSettingsPage />} />
          <Route path="system/warehouse-locations" element={<WarehouseLocationPage />} />
          <Route path="system/injection-machine-rates" element={<InjectionMachineRatePage />} />
          <Route path="system/backup" element={<BackupPage />} />
          <Route path="system/restore" element={<RestorePage />} />
          <Route path="system/upgrade" element={<UpgradePage />} />
          <Route path="logout" element={<LogoutPage />} />
          <Route path="finished-leftover" element={<FinishedLeftoverPage />} />
          <Route path="contract-leftover" element={<ContractLeftoverPage />} />
          <Route path="process-shortage" element={<ProcessShortagePage />} />
          <Route path="assembly-factory-category-detail" element={<FactoryCategoryDetailPage />} />
          <Route path="plastic-monthly-report" element={<PlasticMonthlyReportPage />} />
          <Route path="plastic-in-out-summary" element={<PlasticInOutSummaryPage />} />
          <Route path="plastic-purchase-progress-detail" element={<PlasticPurchaseProgressDetailPage />} />
          <Route path="plastic-raw-material-purchase-progress" element={<PlasticRawMaterialPurchaseProgressPage />} />
          <Route path="plastic-raw-material-issue-progress" element={<PlasticRawMaterialIssueProgressPage />} />
          <Route path="plastic-label-orders" element={<PlasticLabelOrderPage />} />
          <Route path="plastic-material-settings" element={<PlasticMaterialSettingsPage />} />
          <Route path="material-label-orders" element={<MaterialLabelOrderPage />} />
          <Route path="purchase-material-settings" element={<PurchaseMaterialSettingsPage />} />
          <Route path="_todo/:name" element={<PlaceholderPage />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
