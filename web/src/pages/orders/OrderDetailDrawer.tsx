import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag, message } from "antd";
import { ordersApi, type OrderDetail } from "../../api/orders";

export default function OrderDetailDrawer({ 单号, onClose }: { 单号: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<OrderDetail | null>(null);

  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => {
      try { setDetail(await ordersApi.get(单号)); }
      catch { message.error("加载订单详情失败"); }
    })();
  }, [单号]);

  const h = detail?.订货单;
  const s = detail?.总表;

  return (
    <Drawer title={`订单 ${单号 ?? ""}`} width={760} open={!!单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "1", label: "客户", children: `${h?.客户编号 ?? ""} ${h?.客户名称 ?? ""}` },
              { key: "2", label: "款号", children: `${s?.款号 ?? ""} ${s?.款式 ?? ""}` },
              { key: "3", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              { key: "4", label: "数量", children: String(h?.数量 ?? "-") },
              { key: "5", label: "金额", children: h?.金额 == null ? "***" : String(h.金额) },
              { key: "6", label: "交货日期", children: h?.交货日期?.slice(0, 10) ?? "-" },
              { key: "7", label: "生产单号", children: s?.生产单号 ?? "未排产" },
              { key: "8", label: "仓库", children: h?.仓库 ?? "-" },
              { key: "9", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细}
            columns={[
              { title: "色号", dataIndex: "色号" }, { title: "颜色", dataIndex: "颜色" },
              { title: "尺码", dataIndex: "尺码" }, { title: "数量", dataIndex: "数量" },
              { title: "单价", dataIndex: "单价", render: (v: number | null) => (v == null ? "***" : v) },
              { title: "金额", dataIndex: "金额", render: (v: number | null) => (v == null ? "***" : v) },
            ]} />
        </>
      )}
    </Drawer>
  );
}
