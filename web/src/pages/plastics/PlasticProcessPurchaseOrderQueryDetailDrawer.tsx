import { useEffect, useState } from "react";
import { Drawer, Descriptions, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticProcessPurchaseOrderApi } from "../../api/plasticProcessPurchaseOrder";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

export default function PlasticProcessPurchaseOrderQueryDetailDrawer({ open, 单号, onClose }: { open: boolean; 单号?: string; onClose: () => void }) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, "加工采购查询");
  const [head, setHead] = useState<Record<string, unknown> | null>(null);
  const [lines, setLines] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    if (!open || !单号) return;
    plasticProcessPurchaseOrderApi.get(单号).then(d => {
      setHead((d.单头 ?? null) as Record<string, unknown> | null);
      setLines((d.明细 ?? []) as unknown as Record<string, unknown>[]);
    }).catch(() => { setHead(null); setLines([]); });
  }, [open, 单号]);
  const cols: ColumnsType<Record<string, unknown>> = [
    { title: "生产单号", dataIndex: "生产单号" }, { title: "款号", dataIndex: "款号" },
    { title: "模具编号", dataIndex: "模具编号" }, { title: "物料编号", dataIndex: "物料编号" },
    { title: "物料名称", dataIndex: "物料名称" }, { title: "用料名称", dataIndex: "用料名称" },
    { title: "颜色", dataIndex: "颜色" }, { title: "加工内容", dataIndex: "加工内容" },
    { title: "数量", dataIndex: "数量", align: "right" },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", align: "right" as const },
      { title: "金额", dataIndex: "金额", align: "right" as const },
    ]),
    { title: "备注", dataIndex: "备注" },
  ];
  return (
    <Drawer open={open} onClose={onClose} width={900} title={`塑胶加工采购单 ${单号 ?? ""}`}>
      {head && (
        <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="单号">{String(head.单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="日期">{String(head.日期 ?? "").slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="加工厂名称">{String(head.加工厂名称 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="客户名称">{String(head.客户名称 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="审核">{head.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}</Descriptions.Item>
        </Descriptions>
      )}
      <Table rowKey={(_, i) => String(i)} size="small" dataSource={lines} columns={cols} pagination={false} scroll={{ x: "max-content", y: 380 }} />
    </Drawer>
  );
}
