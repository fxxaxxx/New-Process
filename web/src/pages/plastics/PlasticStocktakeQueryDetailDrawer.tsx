import { useEffect, useState } from "react";
import { Drawer, Descriptions, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticDocApi } from "../../api/plasticDocs";

export default function PlasticStocktakeQueryDetailDrawer({ open, 单号, onClose }: { open: boolean; 单号?: string; onClose: () => void }) {
  const [head, setHead] = useState<Record<string, unknown> | null>(null);
  const [lines, setLines] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    if (!open || !单号) return;
    plasticDocApi("plastic-stocktakes").get(单号).then(d => {
      setHead((d.单头 ?? null) as Record<string, unknown> | null);
      setLines((d.明细 ?? []) as unknown as Record<string, unknown>[]);
    }).catch(() => { setHead(null); setLines([]); });
  }, [open, 单号]);
  const cols: ColumnsType<Record<string, unknown>> = [
    { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" }, { title: "颜色", dataIndex: "颜色" },
    { title: "单位", dataIndex: "单位" },
    { title: "系统数量", dataIndex: "系统数量", align: "right" },
    { title: "盘点数量", dataIndex: "盘点数量", align: "right" },
    { title: "盈亏数量", dataIndex: "盈亏数量", align: "right" },
    { title: "备注", dataIndex: "备注" },
  ];
  return (
    <Drawer open={open} onClose={onClose} width={900} title={`塑胶盘点单 ${单号 ?? ""}`}>
      {head && (
        <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="单号">{String(head.单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="日期">{String(head.日期 ?? "").slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="仓库">{String(head.仓库 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="审核">{head.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}</Descriptions.Item>
        </Descriptions>
      )}
      <Table rowKey={(_, i) => String(i)} size="small" dataSource={lines} columns={cols} pagination={false} scroll={{ x: "max-content", y: 380 }} />
    </Drawer>
  );
}
