import { useCallback, useEffect, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { plasticPurchaseProgressApi, type PlasticPurchaseProgressRow } from "../../api/plasticPurchaseProgress";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "塑胶进度表";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticPurchaseProgressPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [supplier, setSupplier] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyOwed, setOnlyOwed] = useState(false);
  const [rows, setRows] = useState<PlasticPurchaseProgressRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticPurchaseProgressApi.list({
        供应商: supplier || undefined,
        起: range[0].format("YYYY-MM-DD"), 止: range[1].format("YYYY-MM-DD"),
        keyword: keyword || undefined, onlyOwed,
      }));
    } catch { message.error("加载塑胶进度表失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, supplier, keyword, onlyOwed]);
  useEffect(() => { load(); }, [canOpen, range, supplier, onlyOwed]); // eslint-disable-line react-hooks/exhaustive-deps

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns: ColumnsType<PlasticPurchaseProgressRow> = [
    { title: "订购日期", dataIndex: "订购日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "交货日期", dataIndex: "交货日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "采购单号", dataIndex: "采购单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "模具编号", dataIndex: "模具编号", width: 100 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "订购数量", dataIndex: "订购数量", width: 90, align: "right" as const },
    { title: "入仓数量", dataIndex: "入仓数量", width: 90, align: "right" as const },
    { title: "欠数", dataIndex: "欠数", width: 90, align: "right" as const },
    { title: "供应商名称", dataIndex: "供应商名称", width: 140 },
    { title: "审核", dataIndex: "审核", width: 80, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
  ];

  const exportCols: ExportCol[] = [
    { title: "订购日期", key: "订购日期", fmt: v => String(v ?? "").slice(0, 10) },
    { title: "交货日期", key: "交货日期", fmt: v => String(v ?? "").slice(0, 10) },
    { title: "采购单号", key: "采购单号" }, { title: "生产单号", key: "生产单号" }, { title: "款号", key: "款号" },
    { title: "物料编号", key: "物料编号" }, { title: "物料名称", key: "物料名称" }, { title: "模具编号", key: "模具编号" },
    { title: "颜色", key: "颜色" }, { title: "单位", key: "单位" },
    { title: "订购数量", key: "订购数量" }, { title: "入仓数量", key: "入仓数量" }, { title: "欠数", key: "欠数" },
    { title: "供应商名称", key: "供应商名称" },
    { title: "审核", key: "审核", fmt: v => (v === "1" ? "已审核" : "未审核") },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶进度表·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶进度表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input placeholder="供应商" allowClear value={supplier}
          onChange={e => setSupplier(e.target.value)} style={{ width: 160 }} />
        <Input.Search placeholder="生产单号/款号/物料" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
        <Checkbox checked={onlyOwed} onChange={e => setOnlyOwed(e.target.checked)}>只看欠数</Checkbox>
        <Button onClick={() => downloadCsv("塑胶进度表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("塑胶进度表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
