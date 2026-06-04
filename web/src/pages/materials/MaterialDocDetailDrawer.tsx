import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag, message } from "antd";
import { materialDocApi, type MaterialDocDetail } from "../../api/materialDocs";
import type { MaterialDocCfg } from "./materialDocConfigs";

const money = (v?: number | null) => (v == null ? "***" : v);

export default function MaterialDocDetailDrawer({ cfg, 单号, onClose }: {
  cfg: MaterialDocCfg; 单号: string | null; onClose: () => void;
}) {
  const [detail, setDetail] = useState<MaterialDocDetail | null>(null);

  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => {
      try { setDetail(await materialDocApi(cfg.resource).get(单号)); }
      catch { message.error("加载单据详情失败"); }
    })();
  }, [单号, cfg.resource]);

  const h = detail?.单头;

  return (
    <Drawer title={`${cfg.title}单 ${单号 ?? ""}`} width={820} open={!!单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "单号", children: h?.单号 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              { key: "qty", label: "数量", children: String(h?.数量 ?? "-") },
              { key: "amt", label: "金额", children: money(h?.金额) },
              { key: "date", label: "日期", children: h?.日期?.slice(0, 10) ?? "-" },
              ...cfg.listExtra.map(f => ({ key: f.name, label: f.label, children: String(h?.[f.name] ?? "-") })),
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细} scroll={{ x: true }}
            columns={[
              { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
              { title: "规格", dataIndex: "规格" }, { title: "颜色", dataIndex: "颜色" }, { title: "单位", dataIndex: "单位" },
              { title: "数量", dataIndex: "数量" },
              { title: "单价", dataIndex: "单价", render: money },
              { title: "金额", dataIndex: "金额", render: money },
            ]} />
        </>
      )}
    </Drawer>
  );
}
