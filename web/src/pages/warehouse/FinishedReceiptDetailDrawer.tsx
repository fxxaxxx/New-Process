import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag, message } from "antd";
import { finishedReceiptApi, type FRDetail } from "../../api/finished";

export default function FinishedReceiptDetailDrawer({ 单号, onClose }: { 单号: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<FRDetail | null>(null);
  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => { try { setDetail(await finishedReceiptApi.get(单号)); } catch { message.error("加载入仓详情失败"); } })();
  }, [单号]);
  const h = detail?.单头;
  return (
    <Drawer title={`成品入仓单 ${单号 ?? ""}`} width={780} open={!!单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "单号", children: h?.单号 ?? "-" },
              { key: "wh", label: "仓库", children: h?.仓库 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              { key: "qty", label: "入仓数量", children: String(h?.数量 ?? "-") },
              { key: "amt", label: "金额", children: h?.金额 == null ? "***" : String(h?.金额) },
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细}
            columns={[
              { title: "款号", dataIndex: "款号" }, { title: "颜色", dataIndex: "颜色" }, { title: "尺码", dataIndex: "尺码" },
              { title: "数量", dataIndex: "数量" },
              { title: "单价", dataIndex: "单价", render: (v?: number | null) => (v == null ? "***" : v) },
              { title: "金额", dataIndex: "金额", render: (v?: number | null) => (v == null ? "***" : v) },
            ]} />
        </>
      )}
    </Drawer>
  );
}
