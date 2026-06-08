import { useCallback, useEffect, useState } from "react";
import { Card, Input, Table, message } from "antd";
import { receivablesApi, type ReceivableRow } from "../../api/sales";

export default function ReceivablesPage() {
  const [rows, setRows] = useState<ReceivableRow[]>([]);
  const [客户编号, set客户编号] = useState("");

  const load = useCallback(async () => {
    try { setRows(await receivablesApi.list(客户编号 || undefined)); }
    catch { message.error("加载应收对账失败"); }
  }, [客户编号]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "客户编号", dataIndex: "客户编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "客户名称", dataIndex: "客户名称" },
    { title: "出货金额", dataIndex: "出货金额" },
    { title: "收款金额", dataIndex: "收款金额" },
    { title: "退货金额", dataIndex: "退货金额" },
    {
      title: "应收余额", dataIndex: "应收余额",
      render: (v: number) => <span style={{ fontWeight: v > 0 ? 700 : 600, color: v > 0 ? "#cf1322" : undefined }}>{v}</span>,
    },
  ];

  return (
    <Card title="应收对账" variant="borderless"
      extra={<Input.Search placeholder="客户编号(留空查全部)" allowClear onSearch={set客户编号} style={{ width: 220 }} />}>
      <Table rowKey={r => String(r.客户编号 ?? r.客户名称)} size="middle" dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
