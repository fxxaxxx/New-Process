// 客户排期表:各客户 Excel 排期数据的统一查询页(筛选/分页/导入/批次管理)
import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Segmented, Select, Space, Table, Tag, message } from "antd";
import { ImportOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { schedulingApi, type ScheduleRow, type ScheduleSummary } from "../../api/scheduling";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import ScheduleImportModal from "./ScheduleImportModal";
import ScheduleBatchesDrawer from "./ScheduleBatchesDrawer";
import ScheduleFilesView from "./ScheduleFilesView";
import StyleMaterialsDrawer from "./StyleMaterialsDrawer";
import ScheduleProductionModal, { type ScheduleProductionCtx } from "./ScheduleProductionModal";

const MENU = "生产排期";
const STATUS_COLOR: Record<string, string> = { 在排: "blue", 已走货: "green", 已取消: "red" };
const fmtDate = (v?: string) => v?.slice(0, 10) ?? "";

// 行展开:整行原始数据(原表头→原值),万全兜底——任何客户任何表头都不丢
function RawDataPanel({ json }: { json?: string }) {
  if (!json) return <span style={{ color: "#999" }}>无原始数据</span>;
  let obj: Record<string, string>;
  try { obj = JSON.parse(json); } catch { return <span>{json}</span>; }
  const cols = [
    { title: "原表头", dataIndex: "k", width: 220 },
    { title: "原值", dataIndex: "v", ellipsis: true },
  ];
  return (
    <Table
      size="small" rowKey="k" columns={cols} pagination={false}
      dataSource={Object.entries(obj).map(([k, v]) => ({ k, v }))}
      scroll={{ y: 300 }}
    />
  );
}

export default function SchedulingPage() {
  const perms = usePerms();
  const [rows, setRows] = useState<ScheduleRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [排期客户, set排期客户] = useState<string>();
  const [状态, set状态] = useState<string>();
  const [range, setRange] = useState<[string, string] | null>(null);
  const [customers, setCustomers] = useState<string[]>([]);
  const [summary, setSummary] = useState<ScheduleSummary[]>([]);
  const [importing, setImporting] = useState(false);
  const [showBatches, setShowBatches] = useState(false);
  const [view, setView] = useState<"rows" | "files">("rows");
  const [styleCtx, setStyleCtx] = useState<{ 货号: string; 品名?: string; 数量?: number; 排期客户?: string; 客户名称?: string; PO号?: string } | null>(null);
  const [prodCtx, setProdCtx] = useState<ScheduleProductionCtx | null>(null);

  // 点货号 → 弹 BOM 物料清单下采购单
  const pick货号 = (r: { 货号?: string; 品名?: string; 数量?: number; 排期客户?: string; 客户名称?: string; PO号?: string }) =>
    r.货号 && setStyleCtx({ 货号: r.货号, 品名: r.品名, 数量: r.数量, 排期客户: r.排期客户, 客户名称: r.客户名称, PO号: r.PO号 });

  // 生产下单 → 按排期行预填生成生产通知单
  const pick生产 = (r: ScheduleRow) =>
    r.货号 && setProdCtx({
      货号: r.货号, 品名: r.品名, 数量: r.数量, 排期客户: r.排期客户, 客户名称: r.客户名称,
      PO号: r.PO号, 客PO: r.客PO, SKU: r.SKU,
      走货期: r.走货期, 接单日期: r.接单日期, 总箱数: r.总箱数,
    });

  const load = useCallback(async () => {
    try {
      const r = await schedulingApi.list({
        page, size: 20, keyword,
        排期客户, 状态,
        走货期从: range?.[0], 走货期至: range?.[1],
      });
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载排期列表失败"); }
  }, [page, keyword, 排期客户, 状态, range]);

  const loadMeta = useCallback(async () => {
    try {
      setCustomers(await schedulingApi.customers());
      setSummary(await schedulingApi.summary());
    } catch { /* 元数据失败不阻塞列表 */ }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadMeta(); }, [loadMeta]);

  const refreshAll = () => { load(); loadMeta(); };

  // 顶部统计:当前选中客户(或全部)的 在排/已走货/已取消 行数
  const stat = (st: string) => summary
    .filter(s => s.状态 === st && (!排期客户 || s.排期客户 === 排期客户))
    .reduce((a, s) => a + s.行数, 0);

  const columns = [
    { title: "货号", dataIndex: "货号", key: "货号", width: 120, ellipsis: true, fixed: "left" as const,
      render: (v: string | undefined, r: ScheduleRow) =>
        v ? <a className="erp-num" onClick={() => pick货号(r)}>{v}</a> : "" },
    { title: "品名", dataIndex: "品名", key: "品名", width: 130, ellipsis: true },
    { title: "状态", dataIndex: "状态", key: "状态", width: 80,
      render: (v?: string) => v && <Tag color={STATUS_COLOR[v]} style={{ borderRadius: 6 }}>{v}</Tag> },
    { title: "排期客户", dataIndex: "排期客户", key: "排期客户", width: 100 },
    { title: "接单日期", dataIndex: "接单日期", key: "接单日期", width: 100, render: fmtDate },
    { title: "客户名称", dataIndex: "客户名称", key: "客户名称", width: 130, ellipsis: true },
    { title: "国家", dataIndex: "国家", key: "国家", width: 80 },
    { title: "PO号", dataIndex: "PO号", key: "PO号", width: 110, ellipsis: true },
    { title: "客PO", dataIndex: "客PO", key: "客PO", width: 110, ellipsis: true },
    { title: "数量", dataIndex: "数量", key: "数量", width: 90, align: "right" as const },
    { title: "总箱数", dataIndex: "总箱数", key: "总箱数", width: 80, align: "right" as const },
    { title: "走货期", dataIndex: "走货期", key: "走货期", width: 100, render: fmtDate },
    { title: "验货期", dataIndex: "验货期", key: "验货期", width: 100, render: fmtDate },
    { title: "车间", dataIndex: "车间", key: "车间", width: 70 },
    { title: "来源工作表", dataIndex: "来源工作表", key: "来源工作表", width: 100, ellipsis: true },
    { title: "备注", dataIndex: "备注", key: "备注", ellipsis: true },
    {
      title: "操作", key: "_op", width: 140, fixed: "right" as const,
      render: (_: unknown, r: ScheduleRow) => r.货号 && (
        <Space size={8}>
          <a onClick={() => pick货号(r)}>物料下单</a>
          {can(perms, "生产制单", "保存") && <a onClick={() => pick生产(r)}>生产下单</a>}
        </Space>
      ),
    },
  ];

  return (
    <Card variant="borderless"
      title="客户排期表"
      extra={view === "files" ? (
        <Space wrap>
          <Button icon={<UnorderedListOutlined />} onClick={() => setShowBatches(true)}>批次</Button>
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<ImportOutlined />} onClick={() => setImporting(true)}>导入排期</Button>
          )}
        </Space>
      ) : (
        <Space wrap>
          <Select
            allowClear placeholder="排期客户" style={{ width: 140 }}
            value={排期客户} onChange={v => { setPage(1); set排期客户(v); }}
            options={customers.map(c => ({ value: c, label: c }))}
          />
          <Select
            allowClear placeholder="状态" style={{ width: 100 }}
            value={状态} onChange={v => { setPage(1); set状态(v); }}
            options={["在排", "已走货", "已取消"].map(s => ({ value: s, label: s }))}
          />
          <DatePicker.RangePicker
            placeholder={["走货期从", "至"]} style={{ width: 230 }}
            onChange={v => {
              setPage(1);
              setRange(v?.[0] && v?.[1] ? [v[0].format("YYYY-MM-DD"), v[1].format("YYYY-MM-DD")] : null);
            }}
          />
          <Input.Search placeholder="搜索 PO/货号/品名/客户" allowClear
            onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 200 }} />
          <Button icon={<UnorderedListOutlined />} onClick={() => setShowBatches(true)}>批次</Button>
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<ImportOutlined />} onClick={() => setImporting(true)}>导入排期</Button>
          )}
        </Space>
      )}>
      {/* 视图切换与状态统计直接放在内容区工具栏,任何主题/屏幕下都可见 */}
      <Space size="middle" style={{ marginBottom: 12 }} wrap>
        <Segmented
          value={view} onChange={v => setView(v as "rows" | "files")}
          options={[{ label: "按排期行", value: "rows" }, { label: "按排期表", value: "files" }]}
        />
        <Tag color="blue" style={{ borderRadius: 6 }}>在排 {stat("在排")}</Tag>
        <Tag color="green" style={{ borderRadius: 6 }}>已走货 {stat("已走货")}</Tag>
        <Tag color="red" style={{ borderRadius: 6 }}>已取消 {stat("已取消")}</Tag>
        <span style={{ color: "#888", fontSize: 12 }}>点货号或「物料下单」生成采购单，「生产下单」生成生产通知单</span>
      </Space>
      {view === "files" ? <ScheduleFilesView customers={customers} onPick货号={pick货号} /> : (
      <Table rowKey="ID" size="middle" dataSource={rows} columns={columns}
        expandable={{ expandedRowRender: (r: ScheduleRow) => <RawDataPanel json={r.原始数据} /> }}
        scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
        pagination={{ current: page, pageSize: 20, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      )}
      <ScheduleImportModal
        open={importing}
        onImport={(cust, fn, rs) => schedulingApi.import(cust, fn, rs)}
        onClose={() => setImporting(false)}
        onDone={refreshAll}
      />
      <ScheduleBatchesDrawer open={showBatches} onClose={() => setShowBatches(false)} onChanged={refreshAll} />
      <StyleMaterialsDrawer ctx={styleCtx} onClose={() => setStyleCtx(null)} />
      <ScheduleProductionModal ctx={prodCtx} onClose={() => setProdCtx(null)} />
    </Card>
  );
}
