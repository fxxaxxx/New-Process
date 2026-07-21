import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Select, Space, Table, Tabs, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, FileExcelOutlined, LeftOutlined, PrinterOutlined, RightOutlined, SearchOutlined, TableOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { semiStockReturnQueryApi, type SemiStkReturnSummaryRow, type SemiStkReturnDetailRow } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "半成品退库";
const FIELDS = ["产品装配名称", "产品货号", "产品名称", "配件编号", "客户"];
const csvDownload = (name: string, cols: readonly string[], rows: Record<string, unknown>[]) => {
  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "﻿" + [cols.join(","), ...rows.map(r => cols.map(k => esc(r[k])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};

export default function SemiStockReturnQueryPage() {
  const perms = usePerms(); const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const [tab, setTab] = useState("summary");
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [field, setField] = useState("产品装配名称");
  const [keyword, setKeyword] = useState("");
  const [materialOnly, setMaterialOnly] = useState(true);
  const [byOrderNo, setByOrderNo] = useState(false);
  const [审核, set审核] = useState("");
  const [summary, setSummary] = useState<SemiStkReturnSummaryRow[]>([]);
  const [detail, setDetail] = useState<SemiStkReturnDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (exact: boolean) => {
    if (!canOpen) return;
    const p = { 起日期: range[0].format("YYYY-MM-DD"), 止日期: range[1].format("YYYY-MM-DD"), field, keyword: keyword.trim() || undefined, exact };
    setLoading(true);
    try {
      if (tab === "summary") setSummary(await semiStockReturnQueryApi.summary({ ...p, materialOnly, byOrderNo }));
      else setDetail(await semiStockReturnQueryApi.detail({ ...p, 审核: 审核 || undefined }));
    } catch { message.error("加载半成品退库查询失败"); }
    finally { setLoading(false); }
  }, [canOpen, tab, range, field, keyword, materialOnly, byOrderNo, 审核]);
  useEffect(() => { void load(false); }, [canOpen, tab, range, materialOnly, byOrderNo, 审核]); // eslint-disable-line react-hooks/exhaustive-deps

  const shiftMonth = (d: number) => { const b = range[0].add(d, "month"); setRange([b.startOf("month"), b.endOf("month")]); };
  const total = useMemo(() => summary.reduce((a, r) => a + Number(r.退料数量 || 0), 0), [summary]);

  const summaryCols: ColumnsType<SemiStkReturnSummaryRow> = [
    { title: "配件编号", dataIndex: "配件编号", width: 130 }, { title: "产品货号", dataIndex: "产品货号", width: 170 },
    { title: "产品名称", dataIndex: "产品名称", width: 200 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 220 },
    { title: "退料数量", dataIndex: "退料数量", width: 120, align: "right", render: (v: number) => Number(v || 0).toLocaleString() },
  ];
  const detailCols: ColumnsType<SemiStkReturnDetailRow> = [
    { title: "日期", dataIndex: "日期", width: 105, render: v => v?.slice(0, 10) }, { title: "单号", dataIndex: "单号", width: 140 },
    { title: "仓库", dataIndex: "仓库", width: 100 }, { title: "退料部门", dataIndex: "退料部门", width: 120 }, { title: "退料人", dataIndex: "退料人", width: 110 },
    { title: "配件编号", dataIndex: "配件编号", width: 120 }, { title: "产品货号", dataIndex: "产品货号", width: 150 },
    { title: "产品名称", dataIndex: "产品名称", width: 170 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 190 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right", render: (v: number) => Number(v || 0).toLocaleString() },
    { title: "备注", dataIndex: "备注", width: 120 },
    { title: "审核", dataIndex: "审核", width: 80, render: v => <Tag color={v === "1" ? "success" : "default"}>{v === "1" ? "已审核" : "未审核"}</Tag> },
  ];

  const exportExcel = () => tab === "summary"
    ? csvDownload("半成品退库查询_汇总.csv", ["配件编号", "产品货号", "产品名称", "产品装配名称", "退料数量"], summary as unknown as Record<string, unknown>[])
    : csvDownload("半成品退库查询_明细.csv", ["日期", "单号", "仓库", "退料部门", "退料人", "配件编号", "产品货号", "产品名称", "产品装配名称", "数量", "备注", "审核"], detail as unknown as Record<string, unknown>[]);

  const rowCount = tab === "summary" ? summary.length : detail.length;
  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  return <Card variant="borderless"
    title={<Space size={16}><span>半成品退库查询</span><span style={{ color: "#52c41a", fontSize: 13 }}>查询记录：{rowCount}{tab === "summary" ? `　总合计：${total.toLocaleString()}` : ""}</span></Space>}
    extra={<Space wrap>
      <Button icon={<LeftOutlined />} onClick={() => shiftMonth(-1)}>上月</Button>
      <Button onClick={() => setRange([dayjs().startOf("month"), dayjs().endOf("month")])}>本月</Button>
      <Button icon={<RightOutlined />} onClick={() => shiftMonth(1)}>下月</Button>
      <Button icon={<TableOutlined />} disabled>表格设置</Button>
      <Button icon={<FileExcelOutlined />} disabled={rowCount === 0} onClick={exportExcel}>导出EXCEL</Button>
      <Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button>
      <Button danger icon={<CloseOutlined />} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
    </Space>}>
    <Space wrap style={{ marginBottom: 12 }}>
      <span style={{ color: "#8c8c8c" }}>日期</span>
      <DatePicker.RangePicker size="small" value={range} allowClear={false} onChange={v => v && v[0] && v[1] && setRange([v[0], v[1]])} />
      <span style={{ color: "#8c8c8c", marginLeft: 8 }}>请选择条件：</span>
      <Select size="small" value={field} onChange={setField} style={{ width: 130 }} options={FIELDS.map(f => ({ value: f, label: f }))} />
      <Input size="small" allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => void load(false)} placeholder="输入查询内容" style={{ width: 220 }} />
      <Button size="small" type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => void load(false)}>查询</Button>
      <Button size="small" icon={<SearchOutlined />} onClick={() => void load(true)}>精确查询</Button>
      {tab === "summary"
        ? <><Checkbox checked={byOrderNo} onChange={e => setByOrderNo(e.target.checked)}>按装配采购单号汇总</Checkbox>
            <Checkbox checked={materialOnly} onChange={e => setMaterialOnly(e.target.checked)}>物料查询(共用物料)</Checkbox></>
        : <Space size={4}><span style={{ color: "#8c8c8c" }}>审核情况</span>
            <Select size="small" value={审核} onChange={set审核} style={{ width: 100 }}
              options={[{ value: "", label: "全部" }, { value: "1", label: "已审核" }, { value: "0", label: "未审核" }]} /></Space>}
    </Space>
    <Tabs activeKey={tab} onChange={setTab} items={[
      { key: "summary", label: "汇总查询", children:
        <Table<SemiStkReturnSummaryRow> rowKey={(r, i) => `${r.配件编号 ?? ""}|${r.产品货号 ?? ""}|${i}`} size="small" loading={loading} columns={summaryCols} dataSource={summary}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} scroll={{ x: 840, y: "calc(100vh - 360px)" }} /> },
      { key: "detail", label: "明细查询", children:
        <Table<SemiStkReturnDetailRow> rowKey={(r, i) => `${r.单号 ?? ""}|${r.配件编号 ?? ""}|${i}`} size="small" loading={loading} columns={detailCols} dataSource={detail}
          onRow={r => ({ onDoubleClick: () => r.单号 && navigate(`/semi-stock-returns?open=${encodeURIComponent(r.单号)}`), style: { cursor: "pointer" } })}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} scroll={{ x: 1500, y: "calc(100vh - 360px)" }} /> },
    ]} />
  </Card>;
}
