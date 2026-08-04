import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Switch, Table, Tabs, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  payablesApi,
  type PayableFactoryRow, type PayableSupplierRow,
  type PayableSupplierSettlementRow, type PayableFactorySettlementRow,
  type PayableSupplierAgingRow, type PayableFactoryAgingRow,
} from "../../api/payables";

const 余额render = (v: number) =>
  <span style={{ fontWeight: v > 0 ? 700 : 600, color: v > 0 ? "#cf1322" : undefined }}>{v}</span>;
const numCell = (v: string) => <span className="erp-num">{v}</span>;
const dateCell = (v?: string) => v?.slice(0, 10);

export default function PayablesPage() {
  return (
    <Card title="应付对账" variant="borderless">
      <Tabs
        items={[
          { key: "sup-sum", label: "供应商汇总", children: <SupplierSummaryTab /> },
          { key: "sup-set", label: "供应商逐单核销", children: <SupplierSettlementTab /> },
          { key: "sup-age", label: "供应商账龄", children: <SupplierAgingTab /> },
          { key: "fac-sum", label: "加工厂汇总", children: <FactorySummaryTab /> },
          { key: "fac-set", label: "加工厂逐单核销", children: <FactorySettlementTab /> },
          { key: "fac-age", label: "加工厂账龄", children: <FactoryAgingTab /> },
        ]}
      />
    </Card>
  );
}

function SupplierSummaryTab() {
  const [rows, setRows] = useState<PayableSupplierRow[]>([]);
  const [编号, set编号] = useState("");
  const load = useCallback(async () => {
    try { setRows(await payablesApi.supplier(编号 || undefined)); }
    catch { message.error("加载供应商应付汇总失败"); }
  }, [编号]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "供应商编号", dataIndex: "供应商编号", render: numCell },
    { title: "供应商名称", dataIndex: "供应商名称" },
    { title: "入仓金额", dataIndex: "入仓金额" },
    { title: "付款金额", dataIndex: "付款金额" },
    { title: "应付余额", dataIndex: "应付余额", render: 余额render },
  ];
  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="供应商编号(留空查全部)" allowClear onSearch={set编号} style={{ width: 220 }} />
      </Space>
      <Table rowKey={r => String(r.供应商编号 ?? r.供应商名称)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}

function FactorySummaryTab() {
  const [rows, setRows] = useState<PayableFactoryRow[]>([]);
  const [编号, set编号] = useState("");
  const load = useCallback(async () => {
    try { setRows(await payablesApi.factory(编号 || undefined)); }
    catch { message.error("加载加工厂应付汇总失败"); }
  }, [编号]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "加工厂编号", dataIndex: "加工厂编号", render: numCell },
    { title: "加工厂名称", dataIndex: "加工厂名称" },
    { title: "回收金额", dataIndex: "回收金额" },
    { title: "付款金额", dataIndex: "付款金额" },
    { title: "应付余额", dataIndex: "应付余额", render: 余额render },
  ];
  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="加工厂编号(留空查全部)" allowClear onSearch={set编号} style={{ width: 220 }} />
      </Space>
      <Table rowKey={r => String(r.加工厂编号 ?? r.加工厂名称)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}

function SupplierSettlementTab() {
  const [rows, setRows] = useState<PayableSupplierSettlementRow[]>([]);
  const [编号, set编号] = useState("");
  const [仅未结清, set仅未结清] = useState(false);
  const load = useCallback(async () => {
    try { setRows(await payablesApi.supplierSettlement(编号 || undefined, 仅未结清)); }
    catch { message.error("加载供应商逐单核销失败"); }
  }, [编号, 仅未结清]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "入仓单号", dataIndex: "入仓单号", render: numCell },
    { title: "入仓日期", dataIndex: "入仓日期", render: dateCell },
    { title: "供应商编号", dataIndex: "供应商编号" },
    { title: "供应商名称", dataIndex: "供应商名称" },
    { title: "应付金额", dataIndex: "应付金额" },
    { title: "已付金额", dataIndex: "已付金额" },
    { title: "未付余额", dataIndex: "未付余额", render: 余额render },
  ];
  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="供应商编号(留空查全部)" allowClear value={编号}
          onChange={e => set编号(e.target.value)} style={{ width: 220 }} />
        <span>仅未结清</span>
        <Switch checked={仅未结清} onChange={set仅未结清} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table rowKey={r => String(r.入仓单号)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}

function FactorySettlementTab() {
  const [rows, setRows] = useState<PayableFactorySettlementRow[]>([]);
  const [编号, set编号] = useState("");
  const [仅未结清, set仅未结清] = useState(false);
  const load = useCallback(async () => {
    try { setRows(await payablesApi.factorySettlement(编号 || undefined, 仅未结清)); }
    catch { message.error("加载加工厂逐单核销失败"); }
  }, [编号, 仅未结清]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "发外单号", dataIndex: "发外单号", render: numCell },
    { title: "回收日期", dataIndex: "回收日期", render: dateCell },
    { title: "加工厂编号", dataIndex: "加工厂编号" },
    { title: "加工厂名称", dataIndex: "加工厂名称" },
    { title: "应付金额", dataIndex: "应付金额" },
    { title: "已付金额", dataIndex: "已付金额" },
    { title: "未付余额", dataIndex: "未付余额", render: 余额render },
  ];
  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="加工厂编号(留空查全部)" allowClear value={编号}
          onChange={e => set编号(e.target.value)} style={{ width: 220 }} />
        <span>仅未结清</span>
        <Switch checked={仅未结清} onChange={set仅未结清} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table rowKey={r => String(r.发外单号)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}

function SupplierAgingTab() {
  const [rows, setRows] = useState<PayableSupplierAgingRow[]>([]);
  const [编号, set编号] = useState("");
  const [基准日, set基准日] = useState<Dayjs | null>(null);
  const load = useCallback(async () => {
    try { setRows(await payablesApi.supplierAging(编号 || undefined, 基准日?.format("YYYY-MM-DD"))); }
    catch { message.error("加载供应商账龄失败"); }
  }, [编号, 基准日]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "供应商编号", dataIndex: "供应商编号", render: numCell },
    { title: "供应商名称", dataIndex: "供应商名称" },
    { title: "0-30天", dataIndex: "账龄0_30" },
    { title: "31-60天", dataIndex: "账龄31_60" },
    { title: "61-90天", dataIndex: "账龄61_90" },
    { title: "90天以上", dataIndex: "账龄90以上" },
    { title: "合计", dataIndex: "合计", render: 余额render },
  ];
  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="供应商编号(留空查全部)" allowClear value={编号}
          onChange={e => set编号(e.target.value)} style={{ width: 220 }} />
        <DatePicker placeholder="基准日(默认今天)" value={基准日} onChange={set基准日}
          disabledDate={d => d.isAfter(dayjs(), "day")} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table rowKey={r => String(r.供应商编号 ?? r.供应商名称)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}

function FactoryAgingTab() {
  const [rows, setRows] = useState<PayableFactoryAgingRow[]>([]);
  const [编号, set编号] = useState("");
  const [基准日, set基准日] = useState<Dayjs | null>(null);
  const load = useCallback(async () => {
    try { setRows(await payablesApi.factoryAging(编号 || undefined, 基准日?.format("YYYY-MM-DD"))); }
    catch { message.error("加载加工厂账龄失败"); }
  }, [编号, 基准日]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "加工厂编号", dataIndex: "加工厂编号", render: numCell },
    { title: "加工厂名称", dataIndex: "加工厂名称" },
    { title: "0-30天", dataIndex: "账龄0_30" },
    { title: "31-60天", dataIndex: "账龄31_60" },
    { title: "61-90天", dataIndex: "账龄61_90" },
    { title: "90天以上", dataIndex: "账龄90以上" },
    { title: "合计", dataIndex: "合计", render: 余额render },
  ];
  return (
    <>
      <Space style={{ marginBottom: 12 }}>
        <Input placeholder="加工厂编号(留空查全部)" allowClear value={编号}
          onChange={e => set编号(e.target.value)} style={{ width: 220 }} />
        <DatePicker placeholder="基准日(默认今天)" value={基准日} onChange={set基准日}
          disabledDate={d => d.isAfter(dayjs(), "day")} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table rowKey={r => String(r.加工厂编号 ?? r.加工厂名称)} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 340px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </>
  );
}
