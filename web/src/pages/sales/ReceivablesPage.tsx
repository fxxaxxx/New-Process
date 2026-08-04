import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Switch, Table, Tabs, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  receivablesApi,
  type ReceivableRow, type ReceivableSettlementRow, type ReceivableAgingRow,
} from "../../api/sales";

export default function ReceivablesPage() {
  return (
    <Card title="应收对账" variant="borderless">
      <Tabs
        items={[
          { key: "summary", label: "客户汇总", children: <SummaryTab /> },
          { key: "settlement", label: "逐单核销", children: <SettlementTab /> },
          { key: "aging", label: "账龄", children: <AgingTab /> },
        ]}
      />
    </Card>
  );
}

function SummaryTab() {
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
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="客户编号(留空查全部)" allowClear onSearch={set客户编号} style={{ width: 220 }} />
      </Space>
      <Table rowKey={r => String(r.客户编号 ?? r.客户名称)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}

function SettlementTab() {
  const [rows, setRows] = useState<ReceivableSettlementRow[]>([]);
  const [客户编号, set客户编号] = useState("");
  const [仅未结清, set仅未结清] = useState(false);

  const load = useCallback(async () => {
    try { setRows(await receivablesApi.settlement(客户编号 || undefined, 仅未结清)); }
    catch { message.error("加载逐单核销失败"); }
  }, [客户编号, 仅未结清]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "出货单号", dataIndex: "出货单号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "出货日期", dataIndex: "出货日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "客户编号", dataIndex: "客户编号" },
    { title: "客户名称", dataIndex: "客户名称" },
    { title: "应收金额", dataIndex: "应收金额" },
    { title: "退货金额", dataIndex: "退货金额" },
    { title: "已收金额", dataIndex: "已收金额" },
    {
      title: "未核销余额", dataIndex: "未核销余额",
      render: (v: number) => <span style={{ fontWeight: v > 0 ? 700 : 600, color: v > 0 ? "#cf1322" : undefined }}>{v}</span>,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="客户编号(留空查全部)" allowClear value={客户编号}
          onChange={e => set客户编号(e.target.value)} style={{ width: 220 }} />
        <span>仅未结清</span>
        <Switch checked={仅未结清} onChange={set仅未结清} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table rowKey={r => String(r.出货单号)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}

function AgingTab() {
  const [rows, setRows] = useState<ReceivableAgingRow[]>([]);
  const [客户编号, set客户编号] = useState("");
  const [基准日, set基准日] = useState<Dayjs | null>(null);

  const load = useCallback(async () => {
    try { setRows(await receivablesApi.aging(客户编号 || undefined, 基准日?.format("YYYY-MM-DD"))); }
    catch { message.error("加载账龄失败"); }
  }, [客户编号, 基准日]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "客户编号", dataIndex: "客户编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "客户名称", dataIndex: "客户名称" },
    { title: "0-30天", dataIndex: "账龄0_30" },
    { title: "31-60天", dataIndex: "账龄31_60" },
    { title: "61-90天", dataIndex: "账龄61_90" },
    { title: "90天以上", dataIndex: "账龄90以上" },
    {
      title: "合计", dataIndex: "合计",
      render: (v: number) => <span style={{ fontWeight: v > 0 ? 700 : 600, color: v > 0 ? "#cf1322" : undefined }}>{v}</span>,
    },
  ];

  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="客户编号(留空查全部)" allowClear value={客户编号}
          onChange={e => set客户编号(e.target.value)} style={{ width: 220 }} />
        <DatePicker placeholder="基准日(默认今天)" value={基准日} onChange={set基准日}
          disabledDate={d => d.isAfter(dayjs(), "day")} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table rowKey={r => String(r.客户编号 ?? r.客户名称)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}
