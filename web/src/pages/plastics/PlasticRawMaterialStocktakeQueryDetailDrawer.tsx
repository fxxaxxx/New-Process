import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialStocktakeApi } from "../../api/plasticRawMaterialStocktake";

export default function PlasticRawMaterialStocktakeQueryDetailDrawer({ open, 单号, onClose }: {
  open: boolean;
  单号?: string;
  onClose: () => void;
}) {
  const [head, setHead] = useState<Record<string, unknown> | null>(null);
  const [lines, setLines] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!open || !单号) return;
    plasticRawMaterialStocktakeApi.get(单号).then(d => {
      setHead((d.单头 ?? null) as unknown as Record<string, unknown> | null);
      setLines((d.明细 ?? []) as unknown as Record<string, unknown>[]);
    }).catch(() => { setHead(null); setLines([]); });
  }, [open, 单号]);

  const cols: ColumnsType<Record<string, unknown>> = [
    { title: "原料编号", dataIndex: "原料编号", width: 120 },
    { title: "原料名称", dataIndex: "原料名称", width: 220 },
    { title: "产地", dataIndex: "产地", width: 110 },
    { title: "每包重量", dataIndex: "每包重量", width: 100, align: "right" },
    { title: "单位", dataIndex: "单位", width: 80 },
    { title: "系统数量", dataIndex: "系统数量", width: 100, align: "right" },
    { title: "盘点数量", dataIndex: "盘点数量", width: 100, align: "right" },
    { title: "盈亏数量", dataIndex: "盈亏数量", width: 100, align: "right" },
    { title: "备注", dataIndex: "备注", width: 160 },
  ];

  return (
    <Drawer open={open} onClose={onClose} width={980} title={`原料盘点单 ${单号 ?? ""}`}>
      {head && (
        <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="单号">{String(head.单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="日期">{String(head.日期 ?? "").slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="电脑单号">{String(head.电脑单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="操作员">{String(head.操作员 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="审核">{head.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}</Descriptions.Item>
          <Descriptions.Item label="备注">{String(head.备注 ?? "")}</Descriptions.Item>
        </Descriptions>
      )}
      <Table rowKey={(_, i) => String(i)} size="small" dataSource={lines} columns={cols} pagination={false} scroll={{ x: "max-content" }} />
    </Drawer>
  );
}
