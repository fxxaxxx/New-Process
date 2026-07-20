import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  assemblyPurchaseQueryApi,
  type AssemblyPurchaseDetailRow,
  type AssemblyPurchaseQueryParams,
  type AssemblyPurchaseSummaryRow,
} from "../../api/assemblyPurchaseQuery";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "款号资料";
const ALL = "全部";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];
const fmtDate = (v?: string) => (v ? String(v).slice(0, 10) : "");
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v).toLocaleString());

export default function AssemblyPurchaseQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const navigate = useNavigate();
  const [tab, setTab] = useState<"summary" | "detail">("summary");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [warehouse, setWarehouse] = useState(ALL);
  const [audit, setAudit] = useState(ALL);
  const [keyword, setKeyword] = useState("");
  const [summary, setSummary] = useState<AssemblyPurchaseSummaryRow[]>([]);
  const [detail, setDetail] = useState<AssemblyPurchaseDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const query = useMemo<AssemblyPurchaseQueryParams>(() => ({
    起: range[0].format("YYYY-MM-DD"),
    止: range[1].format("YYYY-MM-DD"),
    keyword: keyword.trim() || undefined,
    收货仓库: warehouse === ALL ? undefined : warehouse,
    审核情况: audit === ALL ? undefined : audit,
  }), [audit, keyword, range, warehouse]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      if (tab === "summary") setSummary(await assemblyPurchaseQueryApi.summary(query));
      else setDetail(await assemblyPurchaseQueryApi.detail(query));
    } catch {
      message.error("加载装配采购查询失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, query, tab]);

  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const summaryColumns: ColumnsType<AssemblyPurchaseSummaryRow> = [
    { title: "收货仓库", dataIndex: "收货仓库", width: 100 },
    { title: "产品货号", dataIndex: "产品货号", width: 140, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "配件编号", dataIndex: "配件编号", width: 120 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 180 },
    { title: "装配方式", dataIndex: "装配方式", width: 150 },
    { title: "生产单号", dataIndex: "生产单号", width: 140 },
    { title: "加工数量", dataIndex: "加工数量", width: 100, align: "right", render: fmtNum },
  ];

  const detailColumns: ColumnsType<AssemblyPurchaseDetailRow> = [
    { title: "开单日期", dataIndex: "开单日期", width: 105, render: fmtDate },
    { title: "单号", dataIndex: "单号", width: 120, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "完成日期", dataIndex: "完成日期", width: 105, render: fmtDate },
    { title: "收货仓库", dataIndex: "收货仓库", width: 95 },
    { title: "供应商编号", dataIndex: "供应商编号", width: 105 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 160 },
    { title: "产品货号", dataIndex: "产品货号", width: 130 },
    { title: "配件编号", dataIndex: "配件编号", width: 110 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
    { title: "装配方式", dataIndex: "装配方式", width: 140 },
    { title: "生产单号", dataIndex: "生产单号", width: 130 },
    { title: "货币", dataIndex: "货币", width: 70 },
    { title: "数量", dataIndex: "数量", width: 95, align: "right", render: fmtNum },
    { title: "备注", dataIndex: "备注", width: 150 },
    { title: "审核", dataIndex: "审核", width: 75, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
  ];

  const exportNow = (action: "csv" | "print") => {
    const colsSource = tab === "summary" ? summaryColumns : detailColumns;
    const data = (tab === "summary" ? summary : detail) as unknown as Record<string, unknown>[];
    const cols: ExportCol[] = colsSource.map(c => {
      const key = String((c as { dataIndex?: string }).dataIndex ?? "");
      return {
        title: String(c.title),
        key,
        fmt: key.includes("日期") ? (v => String(v ?? "").slice(0, 10)) : key === "审核" ? (v => (v === "1" ? "已审核" : "未审核")) : undefined,
      };
    });
    const name = tab === "summary" ? "装配采购查询-汇总" : "装配采购查询-明细";
    if (action === "csv") downloadCsv(`${name}.csv`, cols, data);
    else printTable(name, cols, data);
  };

  const openOrder = (单号?: string) => {
    if (!单号) return;
    navigate(`/assembly-purchase-orders?单号=${encodeURIComponent(单号)}`);
  };

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面</div></Card>;
  }

  return (
    <Card title="装配采购查询" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <span>日期</span>
        <Select value="出单日期" style={{ width: 110 }} options={[{ value: "出单日期", label: "出单日期" }]} />
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }}
        />
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <span>收货仓库</span>
        <Select value={warehouse} onChange={setWarehouse} style={{ width: 120 }}
          options={[ALL, "成品仓", "半成品仓"].map(v => ({ value: v, label: v }))} />
        <span>审核情况</span>
        <Select value={audit} onChange={setAudit} style={{ width: 120 }}
          options={[ALL, "已审核", "未审核"].map(v => ({ value: v, label: v }))} />
      </Space>
      <Space style={{ marginBottom: 12 }} wrap>
        <span>请选择条件</span>
        <Select value="生产单号" style={{ width: 120 }}
          options={["生产单号", "产品货号", "配件编号", "产品装配名称", "供应商名称"].map(v => ({ value: v, label: v }))} />
        <Input.Search
          placeholder="查询"
          allowClear
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onSearch={load}
          style={{ width: 260 }}
        />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={load}>精确查询</Button>
        <Button onClick={() => exportNow("csv")}>导出EXCEL</Button>
        <Button onClick={() => exportNow("print")}>打印</Button>
        <Button danger onClick={() => window.history.back()}>关闭</Button>
        <span style={{ color: "#888" }}>共查询到记录数：{tab === "summary" ? summary.length : detail.length}</span>
      </Space>

      <Tabs
        activeKey={tab}
        onChange={k => setTab(k as "summary" | "detail")}
        items={[
          { key: "summary", label: "汇总查询" },
          { key: "detail", label: "明细查询" },
        ]}
      />

      {tab === "summary" ? (
        <Table
          rowKey={(r, i) => r.单号 ?? `s-${i}`}
          size="small"
          loading={loading}
          dataSource={summary}
          columns={summaryColumns}
          scroll={{ x: "max-content", y: 560 }}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
          onRow={r => ({ onDoubleClick: () => openOrder(r.单号), style: { cursor: "pointer" } })}
        />
      ) : (
        <Table
          rowKey={(r, i) => r.单号 ?? `d-${i}`}
          size="small"
          loading={loading}
          dataSource={detail}
          columns={detailColumns}
          scroll={{ x: "max-content", y: 560 }}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
          onRow={r => ({ onDoubleClick: () => openOrder(r.单号), style: { cursor: "pointer" } })}
        />
      )}
    </Card>
  );
}
