import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  plasticRawMaterialPurchaseProgressApi,
  type PlasticRawMaterialPurchaseProgressRow,
} from "../../api/plasticRawMaterialPurchaseProgress";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

// 权限照抄后端:gate 在「原料采购订单·打开」(同辅料采购进度表 gate「采购订单」)。
const MENU = "原料采购订单";
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtExportDate = (v: unknown) => fmtDate(typeof v === "string" ? v : undefined);
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));
const fmtProgress = (v?: number | null) =>
  v == null ? "" : <span style={{ color: v >= 100 ? "#3f8600" : "#cf1322" }}>{Number(v)}%</span>;

export default function PlasticRawMaterialPurchaseProgressPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [supplier, setSupplier] = useState("");
  const [dateType, setDateType] = useState("订购日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [onlyOwed, setOnlyOwed] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialPurchaseProgressRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const useDate = dateType !== "不选择日期";
      setRows(await plasticRawMaterialPurchaseProgressApi.list({
        供应商: supplier.trim() || undefined,
        日期类型: useDate ? dateType : undefined,
        起: useDate ? range[0].format("YYYY-MM-DD") : undefined,
        止: useDate ? range[1].format("YYYY-MM-DD") : undefined,
        onlyOwed,
        keyword: keyword.trim() || undefined,
      }));
    } catch {
      message.error("加载原料采购进度表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, dateType, keyword, onlyOwed, range, supplier]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<PlasticRawMaterialPurchaseProgressRow> = useMemo(() => [
    { title: "订购日期", dataIndex: "订购日期", width: 105, render: fmtDate },
    { title: "交货日期", dataIndex: "交货日期", width: 105, render: fmtDate },
    { title: "采购单号", dataIndex: "采购单号", width: 135, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "供应商编号", dataIndex: "供应商编号", width: 105 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 160 },
    { title: "原料编号", dataIndex: "原料编号", width: 115 },
    { title: "原料名称", dataIndex: "原料名称", width: 170 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "单价类型", dataIndex: "单价类型", width: 95 },
    { title: "订货数量", dataIndex: "订货数量", width: 95, align: "right", render: fmtNum },
    { title: "入仓数量", dataIndex: "入仓数量", width: 95, align: "right", render: fmtNum },
    { title: "欠数", dataIndex: "欠数", width: 95, align: "right",
      render: (v?: number | null) => v == null ? "" : <span style={{ color: v > 0 ? "#cf1322" : undefined }}>{Number(v)}</span> },
    { title: "进度", dataIndex: "进度", width: 90, align: "right", render: fmtProgress },
    { title: "审核", dataIndex: "审核", width: 80, align: "center", render: (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
    { title: "备注", dataIndex: "备注", width: 140 },
  ], []);

  const exportCols: ExportCol[] = [
    { title: "订购日期", key: "订购日期", fmt: fmtExportDate },
    { title: "交货日期", key: "交货日期", fmt: fmtExportDate },
    { title: "采购单号", key: "采购单号" },
    { title: "供应商编号", key: "供应商编号" },
    { title: "供应商名称", key: "供应商名称" },
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "规格", key: "规格" },
    { title: "单位", key: "单位" },
    { title: "单价类型", key: "单价类型" },
    { title: "订货数量", key: "订货数量" },
    { title: "入仓数量", key: "入仓数量" },
    { title: "欠数", key: "欠数" },
    { title: "进度", key: "进度" },
    { title: "审核", key: "审核" },
    { title: "备注", key: "备注" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];
  const sum = (k: keyof PlasticRawMaterialPurchaseProgressRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“原料采购订单·打开”权限）。</div></Card>;
  }

  return (
    <Card title="原料采购进度表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Input placeholder="供应商编号/名称" allowClear value={supplier}
          onChange={e => setSupplier(e.target.value)} style={{ width: 150 }} />
        <Select value={dateType} style={{ width: 130 }} onChange={setDateType}
          options={["不选择日期", "订购日期", "交货日期"].map(v => ({ value: v, label: v }))} />
        <DatePicker.RangePicker value={range} allowClear={false} disabled={dateType === "不选择日期"}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Checkbox checked={onlyOwed} onChange={e => setOnlyOwed(e.target.checked)}>只看欠数</Checkbox>
        <Input.Search placeholder="采购单号/供应商/原料编号/名称" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 280 }} />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={() => downloadCsv("原料采购进度表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料采购进度表", exportCols, asRecords())}>打印</Button>
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
              <Table.Summary.Cell index={0} colSpan={10}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{sum("订货数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={11} align="right"><b>{sum("入仓数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={12} align="right"><b>{sum("欠数")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={13} />
              <Table.Summary.Cell index={14} />
              <Table.Summary.Cell index={15} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
}
