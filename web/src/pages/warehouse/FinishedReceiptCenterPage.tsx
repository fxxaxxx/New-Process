import DocQueryTabs from "../../components/DocQueryTabs";
import FinishedReceiptPage from "./FinishedReceiptPage";
import FinishedReceiptQueryPage from "./FinishedReceiptQueryPage";

// 成品入仓合并页:制单(新建/编辑/审核) + 查询(汇总/明细) 合在一个页面两个页签。
// 页签经 ?tab=query 同步;原 /finished-receipt-query 路由重定向到本页查询页签。
export default function FinishedReceiptCenterPage() {
  return (
    <DocQueryTabs
      docLabel="成品入仓单"
      queryLabel="成品入仓查询"
      doc={<FinishedReceiptPage />}
      query={<FinishedReceiptQueryPage />}
    />
  );
}
