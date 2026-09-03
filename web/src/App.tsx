import { lazy, Suspense } from "react";
import { Spin } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { PermissionProvider } from "./auth/PermissionContext";
import RequireAuth from "./auth/RequireAuth";
import Login from "./pages/Login";
import MainLayout from "./pages/MainLayout";
import DocQueryTabs from "./components/DocQueryTabs";
import MasterRouter from "./pages/master/MasterRouter";
import Dashboard from "./pages/Dashboard";
const ChangePasswordPage = lazy(() => import("./pages/ChangePasswordPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
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
const SchedulingPage = lazy(() => import("./pages/scheduling/SchedulingPage"));
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
const MaterialsDocCenter = lazy(() => import("./pages/materials/MaterialsDocCenter"));
const MaterialMasterPage = lazy(() => import("./pages/materials/MaterialMasterPage"));
const MaterialCreateWizard = lazy(() => import("./pages/materials/MaterialCreateWizard"));
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
const MaterialStocktakeQueryPage = lazy(() => import("./pages/materials/MaterialStocktakeQueryPage"));
const CuttingPage = lazy(() => import("./pages/workshop/CuttingPage"));
const PieceworkPage = lazy(() => import("./pages/workshop/PieceworkPage"));
const PieceworkSummaryPage = lazy(() => import("./pages/workshop/PieceworkSummaryPage"));
const OutsourcePage = lazy(() => import("./pages/workshop/OutsourcePage"));
const OutsourceReturnPage = lazy(() => import("./pages/workshop/OutsourceReturnPage"));
const OutsourceReconcilePage = lazy(() => import("./pages/workshop/OutsourceReconcilePage"));
const FinishedReceiptCenterPage = lazy(() => import("./pages/warehouse/FinishedReceiptCenterPage"));
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
          <Route path="messages" element={<MessagesPage />} />
          <Route path="master/:menu" element={<MasterRouter />} />
          <Route path="scheduling" element={<SchedulingPage />} />
          <Route path="styles/:styleNo" element={<StyleDetailPage />} />
          <Route path="bom-setup" element={<BomSetupPage />} />
          <Route path="assembly-factory-inventory" element={<AssemblyFactoryInventoryPage />} />
          <Route path="assembly-factory-category-monthly" element={<AssemblyFactoryCategoryMonthlyPage />} />
          <Route path="assembly-material-setup" element={<BomSetupPage />} />
          <Route path="semi-finished-common-materials" element={<SemiFinishedCommonMaterialsPage />} />
          <Route path="semi-finished-label-orders" element={<DocQueryTabs docLabel="半成品标签单" queryLabel="半成品标签查询" doc={<SemiFinishedLabelOrderPage />} query={<SemiLabelQueryPage />} />} />
          <Route path="semi-finished-shortage-analysis" element={<SemiFinishedShortageAnalysisPage />} />
          <Route path="assembly-material-summary" element={<AssemblyMaterialSummaryPage />} />
          <Route path="assembly-material-tracking" element={<AssemblyMaterialTrackingPage />} />
          <Route path="assembly-purchase-orders" element={<AssemblyPurchaseOrderPage />} />
          <Route path="assembly-purchase-progress" element={<AssemblyPurchaseProgressPage />} />
          <Route path="assembly-purchase-query" element={<AssemblyPurchaseQueryPage />} />
          <Route path="assembly-required-material-detail" element={<AssemblyRequiredMaterialDetailPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="production" element={<DocQueryTabs docLabel="生产通知单" queryLabel="查询生产单" doc={<ProductionNoticePage />} query={<ProductionQueryPage />} />} />
          <Route path="production-query" element={<Navigate to="/production?tab=query" replace />} />
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
          <Route path="materials/:doc" element={<MaterialsDocCenter />} />
          <Route path="material-create" element={<MaterialCreateWizard />} />
          <Route path="material-master" element={<MaterialMasterPage />} />
          <Route path="auxiliary-material-master" element={<AuxiliaryMaterialMasterPage />} />
          <Route path="auxiliary-purchase-analysis" element={<AuxiliaryPurchaseAnalysisPage />} />
          <Route path="auxiliary-purchase-order" element={<DocQueryTabs docLabel="辅料采购订单" queryLabel="辅料采购订单查询" doc={<AuxiliaryPurchaseOrderPage />} query={<AuxiliaryPurchaseOrderQueryPage />} />} />
          <Route path="auxiliary-purchase-progress" element={<AuxiliaryPurchaseProgressPage />} />
          <Route path="auxiliary-issue-progress" element={<AuxiliaryIssueProgressPage />} />
          <Route path="auxiliary-inventory" element={<AuxiliaryInventoryPage />} />
          <Route path="auxiliary-monthly" element={<AuxiliaryMonthlyPage />} />
          <Route path="auxiliary-order-receipt-stats" element={<AuxiliaryOrderReceiptStatsPage />} />
          <Route path="auxiliary-progress-detail" element={<AuxiliaryProgressDetailPage />} />
          <Route path="auxiliary-issue-detail" element={<AuxiliaryIssueDetailPage />} />
          <Route path="auxiliary-purchase-order-query" element={<Navigate to="/auxiliary-purchase-order?tab=query" replace />} />
          <Route path="auxiliary-receipt-query" element={<Navigate to="/auxiliary-receipts?tab=query" replace />} />
          <Route path="auxiliary-stock-issue-query" element={<Navigate to="/auxiliary-issues?tab=query" replace />} />
          <Route path="auxiliary-stock-return-query" element={<Navigate to="/auxiliary-purchase-returns?tab=query" replace />} />
          <Route path="auxiliary-stocktake-query" element={<Navigate to="/auxiliary-stocktakes?tab=query" replace />} />
          <Route path="auxiliary-receipts" element={<DocQueryTabs docLabel="辅料入仓单" queryLabel="辅料入仓查询" doc={<AuxiliaryReceiptPage />} query={<AuxiliaryReceiptQueryPage />} />} />
          <Route path="auxiliary-purchase-returns" element={<DocQueryTabs docLabel="辅料退仓单" queryLabel="辅料退仓查询" doc={<AuxiliaryPurchaseReturnPage />} query={<AuxiliaryStockReturnQueryPage />} />} />
          <Route path="auxiliary-issues" element={<DocQueryTabs docLabel="辅料出库单" queryLabel="辅料出库查询" doc={<AuxiliaryIssuePage />} query={<AuxiliaryStockIssueQueryPage />} />} />
          <Route path="auxiliary-returns" element={<AuxiliaryReturnPage />} />
          <Route path="auxiliary-stocktakes" element={<DocQueryTabs docLabel="辅料盘点单" queryLabel="辅料盘点查询" doc={<AuxiliaryStocktakePage />} query={<AuxiliaryStocktakeQueryPage />} />} />
          <Route path="plastic-material-master" element={<PlasticMaterialMasterPage />} />
          <Route path="plastic-raw-material-master" element={<PlasticRawMaterialMasterPage />} />
          <Route path="plastic-common-materials" element={<PlasticCommonMaterialPage />} />
          <Route path="plastic-molds" element={<PlasticMoldPage />} />
          <Route path="plastic-material-analysis" element={<PlasticMaterialAnalysisPage />} />
          <Route path="plastic-receipts" element={<DocQueryTabs docLabel="塑胶入仓单" queryLabel="塑胶入仓查询" doc={<PlasticReceiptFormPage cfg={PLASTIC_RECEIPT_FORM_CONFIGS["plastic-receipts"]} />} query={<PlasticReceiptQueryPage />} />} />
          <Route path="plastic-issues" element={<DocQueryTabs docLabel="塑胶领料单" queryLabel="塑胶领料查询" doc={<PlasticIssueFormPage />} query={<PlasticIssueQueryPage />} />} />
          <Route path="plastic-returns" element={<DocQueryTabs docLabel="塑胶退料单" queryLabel="塑胶退料查询" doc={<PlasticSupplierDocFormPage cfg={PLASTIC_SUPPLIER_DOC_CONFIGS["plastic-returns"]} />} query={<PlasticReturnQueryPage />} />} />
          <Route path="plastic-warehouse-returns" element={<DocQueryTabs docLabel="塑胶退仓单" queryLabel="塑胶退仓查询" doc={<PlasticReceiptFormPage cfg={PLASTIC_RECEIPT_FORM_CONFIGS["plastic-warehouse-returns"]} />} query={<PlasticWarehouseReturnQueryPage />} />} />
          <Route path="plastic-scraps" element={<DocQueryTabs docLabel="塑胶报废单" queryLabel="塑胶报废查询" doc={<PlasticSupplierDocFormPage cfg={PLASTIC_SUPPLIER_DOC_CONFIGS["plastic-scraps"]} />} query={<PlasticScrapQueryPage />} />} />
          <Route path="plastic-stocktakes" element={<DocQueryTabs docLabel="塑胶盘点单" queryLabel="塑胶盘点查询" doc={<PlasticStocktakePage />} query={<PlasticStocktakeQueryPage />} />} />
          <Route path="plastic-inventory" element={<PlasticInventoryPage />} />
          <Route path="plastic-in-out" element={<PlasticInOutReportPage />} />
          <Route path="plastic-analysis-detail" element={<PlasticAnalysisDetailPage />} />
          <Route path="plastic-order-make" element={<PlasticOrderMakePage />} />
          <Route path="plastic-process-order-make" element={<PlasticProcessOrderMakePage />} />
          <Route path="plastic-purchase-orders" element={<PlasticPurchaseOrderPage />} />
          <Route path="plastic-process-purchase-orders" element={<DocQueryTabs docLabel="塑胶加工采购单" queryLabel="加工采购查询" doc={<PlasticProcessPurchaseOrderPage />} query={<PlasticProcessPurchaseQueryPage />} />} />
          <Route path="plastic-process-purchase-query" element={<Navigate to="/plastic-process-purchase-orders?tab=query" replace />} />
          <Route path="plastic-process-purchase-progress" element={<PlasticProcessPurchaseProgressPage />} />
          <Route path="plastic-process-purchase-detail" element={<PlasticProcessPurchaseDetailPage />} />
          <Route path="plastic-process-issue-progress" element={<PlasticProcessIssueProgressPage />} />
          <Route path="plastic-process-shortage" element={<PlasticProcessShortagePage />} />
          <Route path="plastic-white-part-issue" element={<PlasticWhitePartIssuePage />} />
          <Route path="plastic-raw-material-demand" element={<PlasticRawMaterialDemandPage />} />
          <Route path="plastic-raw-material-demand-summary" element={<PlasticRawMaterialDemandSummaryPage />} />
          <Route path="plastic-raw-material-purchase-analysis" element={<PlasticRawMaterialPurchaseAnalysisPage />} />
          <Route path="plastic-raw-material-purchase-order" element={<PlasticRawMaterialPurchaseOrderPage />} />
          <Route path="plastic-raw-material-receipt" element={<DocQueryTabs docLabel="原料入仓单" queryLabel="原料入仓查询" doc={<PlasticRawMaterialReceiptPage />} query={<PlasticRawMaterialReceiptQueryPage />} />} />
          <Route path="plastic-raw-material-return" element={<DocQueryTabs docLabel="原料退仓单" queryLabel="原料退仓查询" doc={<PlasticRawMaterialReturnPage />} query={<PlasticRawMaterialReturnQueryPage />} />} />
          <Route path="plastic-raw-material-stock-return" element={<DocQueryTabs docLabel="原料退库表" queryLabel="原料退库查询" doc={<PlasticRawMaterialStockReturnPage />} query={<PlasticRawMaterialStockReturnQueryPage />} />} />
          <Route path="plastic-raw-material-stock-issue" element={<DocQueryTabs docLabel="原料出库表" queryLabel="原料出库查询" doc={<PlasticRawMaterialStockIssuePage />} query={<PlasticRawMaterialStockIssueQueryPage />} />} />
          <Route path="plastic-raw-material-stocktake" element={<DocQueryTabs docLabel="原料盘点单" queryLabel="原料盘点查询" doc={<PlasticRawMaterialStocktakePage />} query={<PlasticRawMaterialStocktakeQueryPage />} />} />
          <Route path="plastic-purchase-progress" element={<PlasticPurchaseProgressPage />} />
          <Route path="plastic-customer-type-stats" element={<PlasticCustomerTypeStatsPage />} />
          <Route path="plastic-raw-material-inventory" element={<PlasticRawMaterialInventoryPage />} />
          <Route path="plastic-raw-material-monthly" element={<PlasticRawMaterialMonthlyPage />} />
          <Route path="plastic-raw-material-order-receipt-stats" element={<PlasticRawMaterialOrderReceiptStatsPage />} />
          <Route path="plastic-raw-material-progress-detail" element={<PlasticRawMaterialProgressDetailPage />} />
          <Route path="plastic-raw-material-issue-progress-detail" element={<PlasticRawMaterialIssueProgressDetailPage />} />
          <Route path="plastic-raw-material-outsource-shortage" element={<PlasticRawMaterialOutsourceShortagePage />} />
          <Route path="plastic-raw-material-purchase-order-query" element={<PlasticRawMaterialPurchaseOrderQueryPage />} />
          <Route path="plastic-raw-material-receipt-query" element={<Navigate to="/plastic-raw-material-receipt?tab=query" replace />} />
          <Route path="plastic-raw-material-return-query" element={<Navigate to="/plastic-raw-material-return?tab=query" replace />} />
          <Route path="plastic-raw-material-stock-issue-query" element={<Navigate to="/plastic-raw-material-stock-issue?tab=query" replace />} />
          <Route path="plastic-raw-material-stock-return-query" element={<Navigate to="/plastic-raw-material-stock-return?tab=query" replace />} />
          <Route path="plastic-raw-material-stocktake-query" element={<Navigate to="/plastic-raw-material-stocktake?tab=query" replace />} />
          <Route path="plastic-raw-material-summary" element={<PlasticRawMaterialSummaryPage />} />
          <Route path="plastic-order-query" element={<PlasticOrderQueryPage />} />
          <Route path="plastic-issue-query" element={<Navigate to="/plastic-issues?tab=query" replace />} />
          <Route path="plastic-return-query" element={<Navigate to="/plastic-returns?tab=query" replace />} />
          <Route path="plastic-scrap-query" element={<Navigate to="/plastic-scraps?tab=query" replace />} />
          <Route path="plastic-receipt-query" element={<Navigate to="/plastic-receipts?tab=query" replace />} />
          <Route path="plastic-warehouse-return-query" element={<Navigate to="/plastic-warehouse-returns?tab=query" replace />} />
          <Route path="plastic-stocktake-query" element={<Navigate to="/plastic-stocktakes?tab=query" replace />} />
          <Route path="plastic-label-query" element={<Navigate to="/plastic-label-orders?tab=query" replace />} />
          <Route path="material-inventory" element={<MaterialInventoryPage />} />
          <Route path="material-label-query" element={<Navigate to="/material-label-orders?tab=query" replace />} />
          <Route path="purchase-receipt-query" element={<Navigate to="/materials/purchase-receipts?tab=query" replace />} />
          <Route path="purchase-return-query" element={<Navigate to="/materials/purchase-returns?tab=query" replace />} />
          <Route path="material-issue-query" element={<Navigate to="/materials/material-issues?tab=query" replace />} />
          <Route path="material-return-query" element={<Navigate to="/materials/material-returns?tab=query" replace />} />
          <Route path="material-scrap-query" element={<Navigate to="/materials/material-scraps?tab=query" replace />} />
          <Route path="material-stocktake-query" element={<Navigate to="/materials/material-stocktake?tab=query" replace />} />
          <Route path="cuttings" element={<CuttingPage />} />
          <Route path="piecework" element={<PieceworkPage />} />
          <Route path="piecework-summary" element={<PieceworkSummaryPage />} />
          <Route path="outsourcing" element={<OutsourcePage />} />
          <Route path="outsourcing-returns" element={<OutsourceReturnPage />} />
          <Route path="outsourcing-reconcile" element={<OutsourceReconcilePage />} />
          <Route path="finished-receipts" element={<FinishedReceiptCenterPage />} />
          <Route path="finished-receipt-query" element={<Navigate to="/finished-receipts?tab=query" replace />} />
          <Route path="finished-issues" element={<FinishedIssuePage />} />
          <Route path="finished-stocktakes" element={<FinishedStocktakePage />} />
          <Route path="finished-inventory" element={<FinishedInventoryPage />} />
          <Route path="finished-transfers" element={<FinishedTransferPage />} />
          <Route path="finished-sales-returns" element={<FinishedSalesReturnPage />} />
          <Route path="finished-vendor-returns" element={<FinishedVendorReturnPage />} />
          <Route path="semi-receipts" element={<DocQueryTabs docLabel="半成品入仓单" queryLabel="半成品入仓查询" doc={<SemiReceiptPage />} query={<SemiReceiptQueryPage />} />} />
          <Route path="semi-warehouse-returns" element={<DocQueryTabs docLabel="半成品退仓单" queryLabel="半成品退仓查询" doc={<SemiWarehouseReturnPage />} query={<SemiWhReturnQueryPage />} />} />
          <Route path="semi-issues" element={<DocQueryTabs docLabel="半成品出库单" queryLabel="半成品出库查询" doc={<SemiIssuePage />} query={<SemiIssueQueryPage />} />} />
          <Route path="semi-stock-returns" element={<DocQueryTabs docLabel="半成品退库单" queryLabel="半成品退库查询" doc={<SemiStockReturnPage />} query={<SemiStockReturnQueryPage />} />} />
          <Route path="semi-scraps" element={<DocQueryTabs docLabel="半成品报废单" queryLabel="半成品报废查询" doc={<SemiScrapPage />} query={<SemiScrapQueryPage />} />} />
          <Route path="semi-stocktakes" element={<DocQueryTabs docLabel="半成品盘点单" queryLabel="半成品盘点查询" doc={<SemiStocktakePage />} query={<SemiStocktakeQueryPage />} />} />
          <Route path="materials/material-stocktake" element={<DocQueryTabs docLabel="库存盘点单" queryLabel="库存盘点查询" doc={<MaterialStocktakePage />} query={<MaterialStocktakeQueryPage />} />} />
          <Route path="semi-inventory" element={<SemiInventoryPage />} />
          <Route path="semi-inventory-monthly" element={<SemiMonthlyReportPage />} />
          <Route path="semi-label-query" element={<Navigate to="/semi-finished-label-orders?tab=query" replace />} />
          <Route path="semi-receipt-query" element={<Navigate to="/semi-receipts?tab=query" replace />} />
          <Route path="semi-warehouse-return-query" element={<Navigate to="/semi-warehouse-returns?tab=query" replace />} />
          <Route path="semi-issue-query" element={<Navigate to="/semi-issues?tab=query" replace />} />
          <Route path="semi-stock-return-query" element={<Navigate to="/semi-stock-returns?tab=query" replace />} />
          <Route path="semi-scrap-query" element={<Navigate to="/semi-scraps?tab=query" replace />} />
          <Route path="semi-stocktake-query" element={<Navigate to="/semi-stocktakes?tab=query" replace />} />
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
          <Route path="plastic-label-orders" element={<DocQueryTabs docLabel="塑胶标签单" queryLabel="塑胶标签查询" doc={<PlasticLabelOrderPage />} query={<PlasticLabelQueryPage />} />} />
          <Route path="plastic-material-settings" element={<PlasticMaterialSettingsPage />} />
          <Route path="material-label-orders" element={<DocQueryTabs docLabel="来料标签单" queryLabel="来料标签查询" doc={<MaterialLabelOrderPage />} query={<MaterialLabelQueryPage />} />} />
          <Route path="purchase-material-settings" element={<PurchaseMaterialSettingsPage />} />
          <Route path="_todo/:name" element={<PlaceholderPage />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
