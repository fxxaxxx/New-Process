import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tabs, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import {
  materialScrapQueryApi,
  type MaterialScrapQueryDetailRow,
  type MaterialScrapSummaryRow,
} from "../../api/materialScrapQuery";
import { materialMasterApi, type MaterialCategoryNode } from "../../api/materialMaster";
import { ALL_APPROVAL, ALL_CAT as ALL, buildLabelQuery } from "../../utils/materialLabelQuery";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";
import { MATERIAL_DOC_CONFIGS } from "./materialDocConfigs";
import MaterialDocDetailDrawer from "./MaterialDocDetailDrawer";
import { useAutoReload } from "../../hooks/useAutoReload";

const SCRAP_CFG = MATERIAL_DOC_CONFIGS["material-scraps"];
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function MaterialScrapQueryPage() {
  const [tab, setTab] = useState<"detail" | "summary">("detail");
  const [cats, setCats] = useState<MaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [审核情况, set审核情况] = useState(ALL_APPROVAL);
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(thisMonth);

  const [detail, setDetail] = useState<MaterialScrapQueryDetailRow[]>([]);
  const [summary, setSummary] = useState<MaterialScrapSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const query = useMemo(() => buildLabelQuery({
    keyword, selKey, 审核情况,
    起: range?.[0]?.format("YYYY-MM-DD"),
    止: range?.[1]?.format("YYYY-MM-DD"),
  }), [keyword, selKey, 审核情况, range]);

  const load = useCallback(async (silent = false) => {
    setLoading(true);
    try {
      if (tab === "detail") setDetail(await materialScrapQueryApi.detail(query));
      else setSummary(await materialScrapQueryApi.summary(query));
    } catch { if (!silent) message.error("加载报废单查询失败"); }
    finally { setLoading(false); }
  }, [tab, query]);
  useEffect(() => { load(); }, [load]);
  // 切回本页/窗口聚焦/30秒轮询 自动刷新;silent 失败不弹 toast,避免刷屏
  useAutoReload(() => { void load(true); });

  useEffect(() => {
    materialMasterApi.categories().then(setCats).catch(() => { /* 树取数失败不阻塞主表 */ });
  }, []);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const catOptions = useMemo(() => [
    { value: ALL, label: "所有类别" },
    ...cats.map(c => ({ value: c.类别 ?? "", label: `${c.类别}（${c.数量}）` })),
  ], [cats]);

  const num = (v?: string) => <span className="erp-num">{v}</span>;
  const nowrap = <T,>(cols: T[]): T[] => cols.map(c => ({
    ...c,
    onCell: () => ({ style: { whiteSpace: "nowrap" as const } }),
    onHeaderCell: () => ({ style: { whiteSpace: "nowrap" as const } }),
  }));

  const detailColumns = [
    { title: "生产单号", dataIndex: "生产单号" },
    { title: "款号", dataIndex: "款号" },
    { title: "日期", dataIndex: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "单号", dataIndex: "单号", render: num },
    { title: "报废部门", dataIndex: "报废部门" },
    { title: "报废人", dataIndex: "报废人" },
    { title: "物料编号", dataIndex: "物料编号", render: num },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" },
    { title: "材料", dataIndex: "物料类别" },
    { title: "颜色", dataIndex: "颜色" },
    { title: "单位", dataIndex: "单位" },
    { title: "数量", dataIndex: "数量", align: "right" as const },
    { title: "备注", dataIndex: "备注" },
    { title: "审核", dataIndex: "审核", render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
  ];

  const summaryColumns = [
    { title: "生产单号", dataIndex: "生产单号" },
    { title: "款号", dataIndex: "款号" },
    { title: "物料编号", dataIndex: "物料编号", render: num },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" },
    { title: "材料", dataIndex: "物料类别" },
    { title: "颜色", dataIndex: "颜色" },
    { title: "单位", dataIndex: "单位" },
    { title: "报废数量", dataIndex: "报废数量", align: "right" as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
  ];

  const detailExportCols: ExportCol[] = [
    { title: "生产单号", key: "生产单号" }, { title: "款号", key: "款号" },
    { title: "日期", key: "日期", fmt: v => String(v ?? "").slice(0, 10) },
    { title: "单号", key: "单号" }, { title: "报废部门", key: "报废部门" },
    { title: "报废人", key: "报废人" }, { title: "物料编号", key: "物料编号" },
    { title: "物料名称", key: "物料名称" }, { title: "规格", key: "规格" },
    { title: "材料", key: "物料类别" }, { title: "颜色", key: "颜色" },
    { title: "单位", key: "单位" }, { title: "数量", key: "数量" }, { title: "备注", key: "备注" },
    { title: "审核", key: "审核", fmt: v => (v === "1" ? "已审核" : "未审核") },
  ];
  const summaryExportCols: ExportCol[] = [
    { title: "生产单号", key: "生产单号" }, { title: "款号", key: "款号" },
    { title: "物料编号", key: "物料编号" }, { title: "物料名称", key: "物料名称" },
    { title: "规格", key: "规格" }, { title: "材料", key: "物料类别" },
    { title: "颜色", key: "颜色" }, { title: "单位", key: "单位" }, { title: "报废数量", key: "报废数量" },
  ];

  const exportTarget = () => {
    const isDetail = tab === "detail";
    return {
      cols: isDetail ? detailExportCols : summaryExportCols,
      rows: (isDetail ? detail : summary) as unknown as Record<string, unknown>[],
      name: isDetail ? "报废明细" : "报废汇总",
    };
  };
  const onExport = () => {
    const { cols, rows, name } = exportTarget();
    if (!rows.length) { message.info("无数据可导出"); return; }
    downloadCsv(`${name}.csv`, cols, rows);
  };
  const onPrint = () => {
    const { cols, rows, name } = exportTarget();
    if (!rows.length) { message.info("无数据可打印"); return; }
    printTable(`${name}查询`, cols, rows);
  };

  return (
    <Card title="报废单查询" variant="borderless">
      <div>
        <Space style={{ marginBottom: 12 }} wrap>
          <Button.Group>
            <Button onClick={() => jumpMonth(-1)}>上月</Button>
            <Button onClick={() => jumpMonth(0)}>本月</Button>
            <Button onClick={() => jumpMonth(1)}>下月</Button>
          </Button.Group>
          <DatePicker.RangePicker value={range ?? undefined}
            onChange={v => setRange(v as [Dayjs | null, Dayjs | null] | null)} />
          <Select value={审核情况} onChange={set审核情况} style={{ width: 120 }}
            options={[ALL_APPROVAL, "已审核", "未审核"].map(v => ({ value: v, label: v }))} />
          <Select value={selKey} onChange={setSelKey} style={{ width: 160 }} options={catOptions} />
          <Input.Search placeholder="单号/生产单号/款号/报废人/物料" allowClear onSearch={setKeyword} style={{ width: 240 }} />
          <Button type="primary" onClick={() => load()}>查询</Button>
          <Button onClick={onExport}>导出EXCEL</Button>
          <Button onClick={onPrint}>打印</Button>
        </Space>
        <Tabs activeKey={tab} onChange={k => setTab(k as "detail" | "summary")}
          items={[
            {
              key: "detail", label: "明细查询",
              children: (
                <Table rowKey={(_, i) => `d${i}`} size="small" loading={loading}
                  dataSource={detail} columns={nowrap(detailColumns)} scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
                  pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
                  onRow={r => ({
                    onDoubleClick: () => r.单号 && setViewing(r.单号),
                    style: { cursor: "pointer" },
                  })} />
              ),
            },
            {
              key: "summary", label: "汇总查询",
              children: (
                <Table rowKey={(_, i) => `s${i}`} size="small" loading={loading}
                  dataSource={summary} columns={nowrap(summaryColumns)} scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
                  pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
              ),
            },
          ]} />
      </div>
      <MaterialDocDetailDrawer cfg={SCRAP_CFG} 单号={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
