import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag, message } from "antd";
import { cuttingsApi, type CuttingDetail } from "../../api/cuttings";

export default function CuttingDetailDrawer({ 裁床单号, onClose }: { 裁床单号: string | null; onClose: () => void }) {
  const [detail, setDetail] = useState<CuttingDetail | null>(null);

  useEffect(() => {
    if (!裁床单号) { setDetail(null); return; }
    (async () => {
      try { setDetail(await cuttingsApi.get(裁床单号)); }
      catch { message.error("加载裁床详情失败"); }
    })();
  }, [裁床单号]);

  const h = detail?.单头;

  return (
    <Drawer title={`裁床单 ${裁床单号 ?? ""}`} width={780} open={!!裁床单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "裁床单号", children: h?.裁床单号 ?? "-" },
              { key: "po", label: "生产单号", children: h?.生产单号 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              { key: "k", label: "款号", children: `${h?.款号 ?? ""} ${h?.款式 ?? ""}` },
              { key: "bed", label: "床号", children: h?.床号 ?? "-" },
              { key: "qty", label: "裁床数量", children: String(h?.裁床数量 ?? "-") },
              { key: "cust", label: "客户", children: h?.客户名称 ?? "-" },
              { key: "fab", label: "布种", children: h?.布种 ?? "-" },
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细}
            scroll={{ x: "max-content", y: 380 }}
            columns={[
              { title: "扎号", dataIndex: "扎号" }, { title: "缸号", dataIndex: "缸号" },
              { title: "颜色", dataIndex: "颜色" }, { title: "尺码", dataIndex: "尺码" },
              { title: "数量", dataIndex: "数量" }, { title: "计件数量", dataIndex: "计件数量" },
            ]} />
        </>
      )}
    </Drawer>
  );
}
