import { useParams } from "react-router-dom";
import { MASTER_CONFIGS } from "./configs";
import MasterDataPage from "./MasterDataPage";
import FactoryMasterPage from "./FactoryMasterPage";
import PriceAdjustPage from "./PriceAdjustPage";
import SupplierMasterPage from "./SupplierMasterPage";

export default function MasterRouter() {
  const { menu } = useParams();
  const decoded = menu ? decodeURIComponent(menu) : "";
  if (decoded === "加工厂资料") return <FactoryMasterPage />;
  if (decoded === "调价") return <PriceAdjustPage />;
  // 供应商资料用带类别左树的独立页(说明书 1-1 样式),其余主数据仍走通用页
  if (decoded === "供应商资料") return <SupplierMasterPage />;
  const cfg = menu ? MASTER_CONFIGS[decodeURIComponent(menu)] : undefined;
  if (!cfg) return <div>请选择左侧基础资料项</div>;
  return <MasterDataPage key={cfg.resource} cfg={cfg} />;
}
