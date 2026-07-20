import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialStockIssueApi } from "../../api/plasticRawMaterialStockIssue";

export default function PlasticRawMaterialStockIssueQueryDetailDrawer({ open, 单号, onClose }: {
  open: boolean;
  单号?: string;
  onClose: () => void;
}) {
  const [head, setHead] = useState<Record<string, unknown> | null>(null);
  const [lines, setLines] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!open || !单号) return;
    plasticRawMaterialStockIssueApi.get(单号).then(d => {
      setHead((d.单头 ?? null) as unknown as Record<string, unknown> | null);
      setLines((d.明细 ?? []) as unknown as Record<string, unknown>[]);
    }).catch(() => { setHead(null); setLines([]); });
  }, [open, 单号]);

  const cols: ColumnsType<Record<string, unknown>> = [
    { title: "啤机生产单号", dataIndex: "啤机生产单号" },
    { title: "开单日期", dataIndex: "开单日期", render: v => String(v ?? "").slice(0, 10) },
    { title: "啤机外发单号", dataIndex: "啤机外发单号" },
    { title: "原料编号", dataIndex: "原料编号" },
    { title: "原料名称", dataIndex: "原料名称" },
    { title: "产地", dataIndex: "产地" },
    { title: "每包重量", dataIndex: "每包重量", align: "right" },
    { title: "单位", dataIndex: "单位" },
    { title: "数量", dataIndex: "数量", align: "right" },
    { title: "备注", dataIndex: "备注" },
  ];

  return (
    <Drawer open={open} onClose={onClose} width={960} title={`原料出库单 ${单号 ?? ""}`}>
      {head && (
        <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="单号">{String(head.单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="日期">{String(head.日期 ?? "").slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="生产车间">{String(head.生产车间 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="领料备注">{String(head.领料备注 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="制单人">{String(head.制单人 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="审核">{head.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}</Descriptions.Item>
        </Descriptions>
      )}
      <Table rowKey={(_, i) => String(i)} size="small" dataSource={lines} columns={cols} pagination={false} scroll={{ x: "max-content" }} />
    </Drawer>
  );
}
