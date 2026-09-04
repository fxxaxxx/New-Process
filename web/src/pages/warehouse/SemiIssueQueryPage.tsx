import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Select, Space, Table, Tabs, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, FileExcelOutlined, LeftOutlined, PrinterOutlined, RightOutlined, SearchOutlined, TableOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { semiIssueQueryApi, type SemiIssueSummaryRow, type SemiIssueDetailRow } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { useAutoReload } from "../../hooks/useAutoReload";

const MENU = "半成品领料";
const FIELDS = ["产品装配名称", "产品货号", "产品名称", "配件编号", "客户"];
const csvDownload = (name: string, cols: readonly string[], rows: Record<string, unknown>[]) => {
  const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const csv = "﻿" + [cols.join(","), ...rows.map(r => cols.map(k => esc(r[k])).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
};

export default function SemiIssueQueryPage() {
  const perms = usePerms(); const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const [tab, setTab] = useState("summary");
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [field, setField] = useState("产品装配名称");
  const [keyword, setKeyword] = useState("");
  const [materialOnly, setMaterialOnly] = useState(true);
  const [byIssueRemark, setByIssueRemark] = useState(true);
  const [领料备注, set领料备注] = useState("");
  const [制单人, set制单人] = useState("");
  const [审核, set审核] = useState("");
  const [summary, setSummary] = useState<SemiIssueSummaryRow[]>([]);
  const [detail, setDetail] = useState<SemiIssueDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (exact: boolean, silent = false) => {
    if (!canOpen) return;
    const p = { 起日期: range[0].format("YYYY-MM-DD"), 止日期: range[1].format("YYYY-MM-DD"), field, keyword: keyword.trim() || undefined, exact, 领料备注: 领料备注 || undefined };
    setLoading(true);
    try {
      if (tab === "summary") setSummary(await semiIssueQueryApi.summary({ ...p, materialOnly, byIssueRemark }));
      else setDetail(await semiIssueQueryApi.detail({ ...p, 制单人: 制单人 || undefined, 审核: 审核 || undefined }));
    } catch { if (!silent) message.error("加载半成品出库查询失败"); }
    finally { setLoading(false); }
  }, [canOpen, tab, range, field, keyword, materialOnly, byIssueRemark, 领料备注, 制单人, 审核]);
  useEffect(() => { void load(false); }, [canOpen, tab, range, materialOnly, byIssueRemark, 领料备注, 制单人, 审核]); // eslint-disable-line react-hooks/exhaustive-deps
  // 切回本页/窗口聚焦/30秒轮询 自动刷新;silent 失败不弹 toast,避免刷屏
  useAutoReload(() => { void load(false, true); });

  const shiftMonth = (d: number) => { const b = range[0].add(d, "month"); setRange([b.startOf("month"), b.endOf("month")]); };
  const total = useMemo(() => summary.reduce((a, r) => a + Number(r.领料数量 || 0), 0), [summary]);
  const opt = (vals: (string | null | undefined)[], sel: string) => {
    const s = new Set<string>(); vals.forEach(v => { if (v) s.add(v); }); if (sel) s.add(sel);
    return [{ value: "", label: "全部" }, ...[...s].map(v => ({ value: v, label: v }))];
  };
  const remarkOpts = useMemo(() => opt([...summary.map(r => r.领料备注), ...detail.map(r => r.领料备注)], 领料备注), [summary, detail, 领料备注]);
  const makerOpts = useMemo(() => opt(detail.map(r => r.制单人), 制单人), [detail, 制单人]);

  const summaryCols: ColumnsType<SemiIssueSummaryRow> = [
    { title: "领料备注", dataIndex: "领料备注", width: 100 }, { title: "装配采购", dataIndex: "装配采购", width: 130 },
    { title: "配件编号", dataIndex: "配件编号", width: 120 }, { title: "产品货号", dataIndex: "产品货号", width: 150 },
    { title: "产品名称", dataIndex: "产品名称", width: 170 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 200 },
    { title: "领料数量", dataIndex: "领料数量", width: 110, align: "right", render: (v: number) => Number(v || 0).toLocaleString() },
    { title: "备注", dataIndex: "备注", width: 120 },
  ];
  const detailCols: ColumnsType<SemiIssueDetailRow> = [
    { title: "领料备注", dataIndex: "领料备注", width: 100 }, { title: "装配采购", dataIndex: "装配采购", width: 130 },
    { title: "日期", dataIndex: "日期", width: 105, render: v => v?.slice(0, 10) }, { title: "单号", dataIndex: "单号", width: 140 },
    { title: "领料人", dataIndex: "领料人", width: 130 }, { title: "生产单号", dataIndex: "生产单号", width: 130 },
    { title: "配件编号", dataIndex: "配件编号", width: 110 }, { title: "产品货号", dataIndex: "产品货号", width: 150 },
    { title: "产品名称", dataIndex: "产品名称", width: 150 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 180 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right", render: (v: number) => Number(v || 0).toLocaleString() },
    { title: "备注", dataIndex: "备注", width: 110 }, { title: "制单人", dataIndex: "制单人", width: 90 },
    { title: "审核", dataIndex: "审核", width: 80, render: v => <Tag color={v === "1" ? "success" : "default"}>{v === "1" ? "已审核" : "未审核"}</Tag> },
  ];

  const exportExcel = () => tab === "summary"
    ? csvDownload("半成品出库查询_汇总.csv", ["领料备注", "装配采购", "配件编号", "产品货号", "产品名称", "产品装配名称", "领料数量", "备注"], summary as unknown as Record<string, unknown>[])
    : csvDownload("半成品出库查询_明细.csv", ["领料备注", "装配采购", "日期", "单号", "领料人", "生产单号", "配件编号", "产品货号", "产品名称", "产品装配名称", "数量", "备注", "制单人", "审核"], detail as unknown as Record<string, unknown>[]);

  const rowCount = tab === "summary" ? summary.length : detail.length;
  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  return <Card variant="borderless"
    title={<Space size={16}><span>半成品出库查询</span><span style={{ color: "#52c41a", fontSize: 13 }}>查询记录：{rowCount}{tab === "summary" ? `　总合计：${total.toLocaleString()}` : ""}</span></Space>}
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
      <Select size="small" value={field} onChange={setField} style={{ width: 120 }} options={FIELDS.map(f => ({ value: f, label: f }))} />
      <Input size="small" allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => void load(false)} placeholder="输入查询内容" style={{ width: 190 }} />
      <Button size="small" type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => void load(false)}>查询</Button>
      <Button size="small" icon={<SearchOutlined />} onClick={() => void load(true)}>精确查询</Button>
      <Space size={4}><span style={{ color: "#8c8c8c" }}>领料备注</span>
        <Select size="small" value={领料备注} onChange={set领料备注} style={{ width: 110 }} options={remarkOpts} /></Space>
      <Checkbox checked={materialOnly} onChange={e => setMaterialOnly(e.target.checked)}>物料查询</Checkbox>
      {tab === "summary"
        ? <Checkbox checked={byIssueRemark} onChange={e => setByIssueRemark(e.target.checked)}>汇总按领料备注</Checkbox>
        : <><Space size={4}><span style={{ color: "#8c8c8c" }}>制单人</span>
              <Select size="small" value={制单人} onChange={set制单人} style={{ width: 110 }} options={makerOpts} /></Space>
            <Space size={4}><span style={{ color: "#8c8c8c" }}>审核情况</span>
              <Select size="small" value={审核} onChange={set审核} style={{ width: 100 }}
                options={[{ value: "", label: "全部" }, { value: "1", label: "已审核" }, { value: "0", label: "未审核" }]} /></Space></>}
    </Space>
    <Tabs activeKey={tab} onChange={setTab} items={[
      { key: "summary", label: "汇总查询", children:
        <Table<SemiIssueSummaryRow> rowKey={(r, i) => `${r.领料备注 ?? ""}|${r.装配采购 ?? ""}|${r.配件编号 ?? ""}|${i}`} size="small" loading={loading} columns={summaryCols} dataSource={summary}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} scroll={{ x: 1080, y: "calc(100vh - 360px)" }} /> },
      { key: "detail", label: "明细查询", children:
        <Table<SemiIssueDetailRow> rowKey={(r, i) => `${r.单号 ?? ""}|${r.配件编号 ?? ""}|${r.生产单号 ?? ""}|${i}`} size="small" loading={loading} columns={detailCols} dataSource={detail}
          onRow={r => ({ onDoubleClick: () => r.单号 && navigate(`/semi-issues?open=${encodeURIComponent(r.单号)}`), style: { cursor: "pointer" } })}
          pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} scroll={{ x: 1700, y: "calc(100vh - 360px)" }} /> },
    ]} />
  </Card>;
}
