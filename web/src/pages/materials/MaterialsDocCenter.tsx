import type { ComponentType } from "react";
import { useParams } from "react-router-dom";
import DocQueryTabs from "../../components/DocQueryTabs";
import { MATERIAL_DOC_CONFIGS } from "./materialDocConfigs";
import MaterialDocPage from "./MaterialDocPage";
import PurchaseReceiptQueryPage from "./PurchaseReceiptQueryPage";
import PurchaseReturnQueryPage from "./PurchaseReturnQueryPage";
import MaterialIssueQueryPage from "./MaterialIssueQueryPage";
import MaterialReturnQueryPage from "./MaterialReturnQueryPage";
import MaterialScrapQueryPage from "./MaterialScrapQueryPage";

// 来料仓物料单据(动态路由 materials/:doc)的「单据+查询」合并页:
// 按 doc 段找单据配置和对应查询页,合成两个页签;查询页签下钻仍经 ?open= 回到制单页签。
const QUERY_PAGES: Record<string, { label: string; Page: ComponentType }> = {
  "purchase-receipts": { label: "采购入仓查询", Page: PurchaseReceiptQueryPage },
  "purchase-returns": { label: "采购退仓查询", Page: PurchaseReturnQueryPage },
  "material-issues": { label: "领料单查询", Page: MaterialIssueQueryPage },
  "material-returns": { label: "退料单查询", Page: MaterialReturnQueryPage },
  "material-scraps": { label: "报废单查询", Page: MaterialScrapQueryPage },
};

export default function MaterialsDocCenter() {
  const { doc } = useParams();
  const cfg = doc ? MATERIAL_DOC_CONFIGS[doc] : undefined;
  const q = doc ? QUERY_PAGES[doc] : undefined;
  if (!cfg || !q) return <div>未知的物料单据类型</div>;
  return (
    <DocQueryTabs
      docLabel={cfg.menu}
      queryLabel={q.label}
      doc={<MaterialDocPage key={cfg.resource} cfg={cfg} />}
      query={<q.Page />}
    />
  );
}
