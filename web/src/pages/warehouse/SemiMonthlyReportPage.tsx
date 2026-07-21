import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, FileExcelOutlined, LeftOutlined, PrinterOutlined, RightOutlined, SearchOutlined, TableOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { semiInventoryApi, type SemiMonthlyRow } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "半成品库存";
const WAREHOUSE = "半成品仓";
const FIELDS = ["产品货号", "产品名称", "配件编号", "客户", "产品装配名称"];
const num = (v: number) => <span style={{ color: v < 0 ? "#cf1322" : undefined }}>{Number(v || 0).toLocaleString()}</span>;

export default function SemiMonthlyReportPage() {
  const perms = usePerms(); const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const [rows, setRows] = useState<SemiMonthlyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [field, setField] = useState("产品货号");
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async (exact: boolean, r = range) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await semiInventoryApi.monthly({
        仓库: WAREHOUSE, 起日期: r[0].format("YYYY-MM-DD"), 止日期: r[1].format("YYYY-MM-DD"),
        field, keyword: keyword.trim() || undefined, exact,
      }));
    } catch { message.error("加载半成品库存月报表失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, field, keyword]);
  useEffect(() => { void load(false); }, [canOpen, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const shiftMonth = (delta: number) => {
    const base = range[0].add(delta, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };
  const thisMonth = () => setRange([dayjs().startOf("month"), dayjs().endOf("month")]);

  const exportExcel = () => {
    const cols = ["配件编号", "客户", "产品货号", "产品名称", "产品装配名称", "期初库存", "本期入库", "本期出库", "本期报废", "盘点盈亏", "期末库存"] as const;
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = "﻿" + [cols.join(","), ...rows.map(r => cols.map(k => esc(r[k])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `半成品库存月报表_${range[0].format("YYYYMM")}.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const columns: ColumnsType<SemiMonthlyRow> = [
    { title: "配件编号", dataIndex: "配件编号", width: 120, fixed: "left" },
    { title: "客户", dataIndex: "客户", width: 100 },
    { title: "产品货号", dataIndex: "产品货号", width: 150 },
    { title: "产品名称", dataIndex: "产品名称", width: 180 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 190 },
    { title: "期初库存", dataIndex: "期初库存", width: 100, align: "right", render: num },
    { title: "本期入库", dataIndex: "本期入库", width: 100, align: "right", render: num },
    { title: "本期出库", dataIndex: "本期出库", width: 100, align: "right", render: num },
    { title: "本期报废", dataIndex: "本期报废", width: 100, align: "right", render: num },
    { title: "盘点盈亏", dataIndex: "盘点盈亏", width: 100, align: "right", render: num },
    { title: "期末库存", dataIndex: "期末库存", width: 110, align: "right", render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{Number(v || 0).toLocaleString()}</span> },
  ];

  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  return <Card variant="borderless"
    title={<Space size={16}><span>半成品库存月报表</span><span style={{ color: "#52c41a", fontSize: 13 }}>查询记录：{rows.length}</span></Space>}
    extra={<Space wrap>
      <Button icon={<LeftOutlined />} onClick={() => shiftMonth(-1)}>上月</Button>
      <Button onClick={thisMonth}>本月</Button>
      <Button icon={<RightOutlined />} onClick={() => shiftMonth(1)}>下月</Button>
      <Button icon={<TableOutlined />} disabled>表格设置</Button>
      <Button icon={<FileExcelOutlined />} disabled={rows.length === 0} onClick={exportExcel}>导出EXCEL</Button>
      <Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button>
      <Button danger icon={<CloseOutlined />} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
    </Space>}>
    <Space wrap style={{ marginBottom: 12 }}>
      <span style={{ color: "#8c8c8c" }}>日期</span>
      <DatePicker.RangePicker size="small" value={range} allowClear={false} onChange={v => v && v[0] && v[1] && setRange([v[0], v[1]])} />
      <span style={{ color: "#8c8c8c", marginLeft: 8 }}>请选择条件：</span>
      <Select size="small" value={field} onChange={setField} style={{ width: 130 }} options={FIELDS.map(f => ({ value: f, label: f }))} />
      <Input size="small" allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => void load(false)} placeholder="输入查询内容" style={{ width: 240 }} />
      <Button size="small" type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => void load(false)}>查询</Button>
      <Button size="small" icon={<SearchOutlined />} onClick={() => void load(true)}>精确查询</Button>
      <Tag color="default">仓库：{WAREHOUSE}</Tag>
    </Space>
    <Table<SemiMonthlyRow> rowKey={(r, i) => `${r.配件编号 ?? ""}|${i}`} size="small" loading={loading} columns={columns} dataSource={rows}
      pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `共 ${t} 条` }} scroll={{ x: 1450, y: "calc(100vh - 320px)" }} />
  </Card>;
}
