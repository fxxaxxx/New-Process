import { useEffect, useState } from "react";
import { Descriptions, Drawer, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialReturnApi } from "../../api/plasticRawMaterialReturn";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

export default function PlasticRawMaterialReturnQueryDetailDrawer({ open, 单号, onClose }: {
  open: boolean;
  单号?: string;
  onClose: () => void;
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, "原料退仓查询");
  const [head, setHead] = useState<Record<string, unknown> | null>(null);
  const [lines, setLines] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    if (!open || !单号) return;
    plasticRawMaterialReturnApi.get(单号).then(d => {
      setHead((d.单头 ?? null) as unknown as Record<string, unknown> | null);
      setLines((d.明细 ?? []) as unknown as Record<string, unknown>[]);
    }).catch(() => { setHead(null); setLines([]); });
  }, [open, 单号]);

  const cols: ColumnsType<Record<string, unknown>> = [
    { title: "原料编号", dataIndex: "原料编号" },
    { title: "原料名称", dataIndex: "原料名称" },
    { title: "产地", dataIndex: "产地" },
    { title: "每包重量", dataIndex: "每包重量", align: "right" },
    { title: "单价类型", dataIndex: "单价类型" },
    { title: "单位", dataIndex: "单位" },
    { title: "数量", dataIndex: "数量", align: "right" },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", align: "right" as const },
      { title: "金额", dataIndex: "金额", align: "right" as const },
    ]),
    { title: "备注", dataIndex: "备注" },
  ];

  return (
    <Drawer open={open} onClose={onClose} width={900} title={`原料退仓单 ${单号 ?? ""}`}>
      {head && (
        <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}>
          <Descriptions.Item label="单号">{String(head.单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="日期">{String(head.日期 ?? "").slice(0, 10)}</Descriptions.Item>
          <Descriptions.Item label="供应商名称">{String(head.供应商名称 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="电脑单号">{String(head.电脑单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="入仓单号">{String(head.入仓单号 ?? "")}</Descriptions.Item>
          <Descriptions.Item label="审核">{head.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}</Descriptions.Item>
        </Descriptions>
      )}
      <Table rowKey={(_, i) => String(i)} size="small" dataSource={lines} columns={cols} pagination={false} scroll={{ x: "max-content", y: 380 }} />
    </Drawer>
  );
}
