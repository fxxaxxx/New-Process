import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { plasticScrapQueryApi, type PlasticScrapQueryDetailRow, type PlasticScrapQuerySummaryRow, type PlasticScrapQueryParams } from "../../api/plasticScrapQuery";
import { plasticMaterialMasterApi, type PlasticMaterialCategoryNode } from "../../api/plasticMaterialMaster";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";
import PlasticScrapDetailDrawer from "./PlasticScrapDetailDrawer";

const MENU = "塑胶报废查询";
const ALL = "__ALL__";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticScrapQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [tab, setTab] = useState<"detail" | "summary">("detail");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [审核情况, set审核情况] = useState("");
  const [selCat, setSelCat] = useState(ALL);
  const [keyword, setKeyword] = useState("");
  const [cats, setCats] = useState<PlasticMaterialCategoryNode[]>([]);
  const [detail, setDetail] = useState<PlasticScrapQueryDetailRow[]>([]);
  const [summary, setSummary] = useState<PlasticScrapQuerySummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<string | undefined>(undefined);

  const query = useMemo<PlasticScrapQueryParams>(() => ({
    起: range[0].format("YYYY-MM-DD"), 止: range[1].format("YYYY-MM-DD"),
    keyword: keyword || undefined, 审核情况: 审核情况 || undefined,
    物料类别: selCat === ALL ? undefined : selCat,
  }), [range, keyword, 审核情况, selCat]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      if (tab === "detail") setDetail(await plasticScrapQueryApi.detail(query));
      else setSummary(await plasticScrapQueryApi.summary(query));
    } catch { message.error("加载塑胶报废查询失败"); }
    finally { setLoading(false); }
  }, [canOpen, tab, query]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { if (canOpen) plasticMaterialMasterApi.categories().then(setCats).catch(() => {}); }, [canOpen]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };
  const fix2 = (v?: number | null) => (v == null ? "" : Number(v).toFixed(2));

  const detailColumns: ColumnsType<PlasticScrapQueryDetailRow> = [
    { title: "日期", dataIndex: "日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "单号", dataIndex: "单号", width: 130, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "生产单号", dataIndex: "生产单号", width: 130 },
    { title: "款号", dataIndex: "款号", width: 100 },
    { title: "报废部门", dataIndex: "报废部门", width: 100 },
    { title: "报废人", dataIndex: "报废人", width: 90 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 100 },
    { title: "共用物料", dataIndex: "共用物料", width: 110 },
    { title: "共用货号", dataIndex: "共用货号", width: 100 },
    { title: "单位", dataIndex: "单位", width: 56 },
    { title: "数量", dataIndex: "数量", width: 80, align: "right" },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
      { title: "金额", dataIndex: "金额", width: 100, align: "right" as const, render: fix2 },
    ]),
    { title: "备注", dataIndex: "备注", width: 120 },
    { title: "审核", dataIndex: "审核", width: 60, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
  ];
  const summaryColumns: ColumnsType<PlasticScrapQuerySummaryRow> = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 100 },
    { title: "共用物料", dataIndex: "共用物料", width: 110 },
    { title: "共用货号", dataIndex: "共用货号", width: 100 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "数量", dataIndex: "数量", width: 100, align: "right" },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
      { title: "金额", dataIndex: "金额", width: 120, align: "right" as const, render: fix2 },
    ]),
  ];

  const exportNow = (action: "csv" | "print") => {
    const srcCols = tab === "detail" ? detailColumns : summaryColumns;
    const cols: ExportCol[] = srcCols.map(c => {
      const key = String((c as { dataIndex?: string }).dataIndex ?? "");
      return {
        title: String(c.title),
        key,
        fmt: key === "日期" ? (v => String(v ?? "").slice(0, 10)) : key === "审核" ? (v => (v === "1" ? "已审核" : "未审核")) : undefined,
      };
    });
    const data = (tab === "detail" ? detail : summary) as unknown as Record<string, unknown>[];
    const name = tab === "detail" ? "塑胶报废查询-明细" : "塑胶报废查询-汇总";
    if (action === "csv") downloadCsv(`${name}.csv`, cols, data); else printTable(name, cols, data);
  };

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“塑胶报废查询·打开”权限）。</div></Card>;
  }

  return (
    <Card title="塑胶报废查询" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Select value={审核情况} onChange={set审核情况} style={{ width: 120 }}
          options={[{ value: "", label: "审核:全部" }, { value: "已审核", label: "已审核" }, { value: "未审核", label: "未审核" }]} />
        <Select value={selCat} onChange={setSelCat} style={{ width: 150 }}
          options={[{ value: ALL, label: "所有类别" }, ...cats.map(c => ({ value: c.类别 ?? "", label: `${c.类别}（${c.数量}）` }))]} />
        <Input.Search placeholder="物料编号/名称/生产单号/款号" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
        <Button onClick={() => exportNow("csv")}>导出EXCEL</Button>
        <Button onClick={() => exportNow("print")}>打印</Button>
      </Space>
      <Tabs activeKey={tab} onChange={k => setTab(k as "detail" | "summary")}
        items={[
          { key: "detail", label: "明细查询" }, { key: "summary", label: "汇总查询" },
        ]} />
      {tab === "detail"
        ? <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={detail} columns={detailColumns}
            scroll={{ x: "max-content", y: "calc(100vh - 340px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
            onRow={r => ({ onDoubleClick: () => { if (r.单号) setViewing(r.单号); }, style: { cursor: "pointer" } })} />
        : <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={summary} columns={summaryColumns}
            scroll={{ x: "max-content", y: "calc(100vh - 340px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />}
      <PlasticScrapDetailDrawer open={viewing !== undefined} 单号={viewing} onClose={() => setViewing(undefined)} />
    </Card>
  );
}
