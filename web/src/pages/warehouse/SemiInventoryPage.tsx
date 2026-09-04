import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, FileExcelOutlined, PrinterOutlined, SearchOutlined, TableOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { semiInventoryApi, type SemiInvReportRow } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { useAutoReload } from "../../hooks/useAutoReload";

const MENU = "半成品库存";
const WAREHOUSE = "半成品仓";
const FIELDS = ["产品货号", "产品名称", "配件编号", "客户", "产品装配名称"];

export default function SemiInventoryPage() {
  const perms = usePerms(); const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const [rows, setRows] = useState<SemiInvReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);      // 显示：有发生的记录 / 全部记录
  const [includeZero, setIncludeZero] = useState(false); // 零库存：只显示库存数 / 含零库存
  const [field, setField] = useState("产品货号");
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async (exact: boolean, silent = false) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await semiInventoryApi.report({ 仓库: WAREHOUSE, field, keyword: keyword.trim() || undefined, exact, includeZero, showAll })); }
    catch { if (!silent) message.error("加载半成品库存统计表失败"); }
    finally { setLoading(false); }
  }, [canOpen, field, keyword, includeZero, showAll]);
  useEffect(() => { void load(false); }, [canOpen, showAll, includeZero]); // eslint-disable-line react-hooks/exhaustive-deps
  // 切回本页/窗口聚焦/30秒轮询 自动刷新;silent 失败不弹 toast,避免刷屏
  useAutoReload(() => { void load(false, true); });

  const exportExcel = () => {
    const cols = ["配件编号", "客户", "产品货号", "产品名称", "产品装配名称", "库存数量", "仓库位置"] as const;
    const esc = (v: unknown) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = "﻿" + [cols.join(","), ...rows.map(r => cols.map(k => esc(r[k])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "半成品库存统计表.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const columns: ColumnsType<SemiInvReportRow> = [
    { title: "配件编号", dataIndex: "配件编号", width: 130 },
    { title: "客户", dataIndex: "客户", width: 110 },
    { title: "产品货号", dataIndex: "产品货号", width: 170 },
    { title: "产品名称", dataIndex: "产品名称", width: 200 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 220 },
    { title: "库存数量", dataIndex: "库存数量", width: 110, align: "right",
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{Number(v).toLocaleString()}</span> },
    { title: "仓库位置", dataIndex: "仓库位置", width: 130 },
  ];

  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  return <Card variant="borderless"
    title={<Space size={16}><span>半成品库存统计表</span><span style={{ color: "#52c41a", fontSize: 13 }}>查询记录：{rows.length}</span></Space>}
    extra={<Space wrap>
      <Space size={4}><span style={{ color: "#8c8c8c" }}>显示</span>
        <Select size="small" value={showAll} onChange={setShowAll} style={{ width: 130 }}
          options={[{ value: false, label: "有发生的记录" }, { value: true, label: "全部记录" }]} /></Space>
      <Space size={4}><span style={{ color: "#8c8c8c" }}>零库存</span>
        <Select size="small" value={includeZero} onChange={setIncludeZero} style={{ width: 130 }}
          options={[{ value: false, label: "只显示库存数" }, { value: true, label: "含零库存" }]} /></Space>
      <Button icon={<TableOutlined />} disabled>表格设置</Button>
      <Button icon={<FileExcelOutlined />} disabled={rows.length === 0} onClick={exportExcel}>导出EXCEL</Button>
      <Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button>
      <Button danger icon={<CloseOutlined />} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
    </Space>}>
    <Space wrap style={{ marginBottom: 12 }}>
      <span style={{ color: "#8c8c8c" }}>请选择条件：</span>
      <Select size="small" value={field} onChange={setField} style={{ width: 130 }} options={FIELDS.map(f => ({ value: f, label: f }))} />
      <Input size="small" allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onPressEnter={() => void load(false)} placeholder="输入查询内容" style={{ width: 260 }} />
      <Button size="small" type="primary" icon={<SearchOutlined />} loading={loading} onClick={() => void load(false)}>查询</Button>
      <Button size="small" icon={<SearchOutlined />} onClick={() => void load(true)}>精确查询</Button>
      <Tag color="default">仓库：{WAREHOUSE}</Tag>
    </Space>
    <Table<SemiInvReportRow> rowKey={(r, i) => `${r.配件编号 ?? ""}|${i}`} size="small" loading={loading} columns={columns} dataSource={rows}
      pagination={{ pageSize: 50, showSizeChanger: true, showTotal: t => `共 ${t} 条` }} scroll={{ x: 1070, y: "calc(100vh - 320px)" }} />
  </Card>;
}
