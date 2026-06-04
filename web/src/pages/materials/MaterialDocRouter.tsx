import { useParams } from "react-router-dom";
import { MATERIAL_DOC_CONFIGS } from "./materialDocConfigs";
import MaterialDocPage from "./MaterialDocPage";

export default function MaterialDocRouter() {
  const { doc } = useParams();
  const cfg = doc ? MATERIAL_DOC_CONFIGS[doc] : undefined;
  if (!cfg) return <div>未知的物料单据类型</div>;
  return <MaterialDocPage key={cfg.resource} cfg={cfg} />;
}
