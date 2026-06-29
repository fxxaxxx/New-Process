import { useParams } from "react-router-dom";
import { MASTER_CONFIGS } from "./configs";
import MasterDataPage from "./MasterDataPage";
import FactoryMasterPage from "./FactoryMasterPage";

export default function MasterRouter() {
  const { menu } = useParams();
  const decoded = menu ? decodeURIComponent(menu) : "";
  if (decoded === "加工厂资料") return <FactoryMasterPage />;
  const cfg = menu ? MASTER_CONFIGS[decodeURIComponent(menu)] : undefined;
  if (!cfg) return <div>请选择左侧基础资料项</div>;
  return <MasterDataPage key={cfg.resource} cfg={cfg} />;
}
