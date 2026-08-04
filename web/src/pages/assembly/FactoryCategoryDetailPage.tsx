import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { factoryCategoryDetailApi, type FactoryCategoryDetailRow } from "../../api/factoryCategoryDetail";
import { factoryMasterApi, type FactoryCategoryNode } from "../../api/factoryMaster";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

// 权限照抄后端:gate 在「款号资料」(同加工厂分类月报表)。
const MENU = "款号资料";
const ALL = "全部";
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtExportDate = (v: unknown) => fmtDate(typeof v === "string" ? v : undefined);
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));

export default function FactoryCategoryDetailPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [cats, setCats] = useState<FactoryCategoryNode[]>([]);
  const [cat, setCat] = useState(ALL);
  const [factory, setFactory] = useState("");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<FactoryCategoryDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await factoryCategoryDetailApi.list({
        起: range[0].format("YYYY-MM-DD"),
        止: range[1].format("YYYY-MM-DD"),
        类别: cat === ALL ? undefined : cat,
        加工厂: factory.trim() || undefined,
        keyword: keyword.trim() || undefined,
      }));
    } catch {
      message.error("加载加工厂分类明细表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, cat, factory, keyword, range]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!canOpen) return;
    factoryMasterApi.categories().then(setCats).catch(() => { /* 忽略 */ });
  }, [canOpen]);

  const money = (v?: number | null) => (priceHidden ? "***" : fmtNum(v));

  const columns: ColumnsType<FactoryCategoryDetailRow> = useMemo(() => [
    { title: "加工厂类别", dataIndex: "加工厂类别", width: 110 },
    { title: "加工厂编号", dataIndex: "加工厂编号", width: 105 },
    { title: "加工厂名称", dataIndex: "加工厂名称", width: 160 },
    { title: "单据类型", dataIndex: "单据类型", width: 130 },
    { title: "单号", dataIndex: "单号", width: 135, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "日期", dataIndex: "日期", width: 105, render: fmtDate },
    { title: "交货日期", dataIndex: "交货日期", width: 105, render: fmtDate },
    { title: "客户名称", dataIndex: "客户名称", width: 150 },
    { title: "数量", dataIndex: "数量", width: 100, align: "right", render: fmtNum },
    { title: "金额", dataIndex: "金额", width: 110, align: "right", render: money },
    { title: "审核", dataIndex: "审核", width: 80, align: "center", render: (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [priceHidden]);

  const exportCols: ExportCol[] = [
    { title: "加工厂类别", key: "加工厂类别" },
    { title: "加工厂编号", key: "加工厂编号" },
    { title: "加工厂名称", key: "加工厂名称" },
    { title: "单据类型", key: "单据类型" },
    { title: "单号", key: "单号" },
    { title: "日期", key: "日期", fmt: fmtExportDate },
    { title: "交货日期", key: "交货日期", fmt: fmtExportDate },
    { title: "客户名称", key: "客户名称" },
    { title: "数量", key: "数量" },
    { title: "金额", key: "金额" },
    { title: "审核", key: "审核" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];
  const sum = (k: keyof FactoryCategoryDetailRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“款号资料·打开”权限）。</div></Card>;
  }

  return (
    <Card title="加工厂分类明细表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={cat} style={{ width: 130 }} onChange={setCat}
          options={[ALL, ...cats.map(c => c.类别 ?? "")].filter(v => v !== "").map(v => ({ value: v, label: v }))} />
        <Input placeholder="加工厂编号/名称" allowClear value={factory}
          onChange={e => setFactory(e.target.value)} style={{ width: 150 }} />
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="单号/客户/加工厂" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={() => downloadCsv("加工厂分类明细表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("加工厂分类明细表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table
        rowKey={(_, i) => String(i)}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><b>{sum("数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right"><b>{priceHidden ? "***" : sum("金额")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
}
