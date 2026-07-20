import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  plasticRawMaterialProgressDetailApi,
  type PlasticRawMaterialProgressDetailRow,
} from "../../api/plasticRawMaterialProgressDetail";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料进度明细表";
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtExportDate = (v: unknown) => fmtDate(typeof v === "string" ? v : undefined);
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));

export default function PlasticRawMaterialProgressDetailPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [arrivalStatus, setArrivalStatus] = useState("未到");
  const [dateType, setDateType] = useState("不选择日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialProgressDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const useDate = dateType !== "不选择日期";
      setRows(await plasticRawMaterialProgressDetailApi.list({
        到货情况: arrivalStatus === "全部" ? undefined : arrivalStatus,
        日期类型: useDate ? dateType : undefined,
        起: useDate ? range[0].format("YYYY-MM-DD") : undefined,
        止: useDate ? range[1].format("YYYY-MM-DD") : undefined,
        keyword: keyword.trim() || undefined,
      }));
    } catch {
      message.error("加载原料进度明细表失败");
    } finally {
      setLoading(false);
    }
  }, [arrivalStatus, canOpen, dateType, keyword, range]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<PlasticRawMaterialProgressDetailRow> = useMemo(() => [
    { title: "订购日期", dataIndex: "订购日期", width: 105, render: fmtDate },
    { title: "交货日期", dataIndex: "交货日期", width: 105, render: fmtDate },
    { title: "订购单号", dataIndex: "订购单号", width: 135, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "供应商名称", dataIndex: "供应商名称", width: 160 },
    { title: "原料编号", dataIndex: "原料编号", width: 115 },
    { title: "原料名称", dataIndex: "原料名称", width: 170 },
    { title: "产地", dataIndex: "产地", width: 110 },
    { title: "每包重量", dataIndex: "每包重量", width: 95, align: "right", render: fmtNum },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "单价类型", dataIndex: "单价类型", width: 95 },
    { title: "订货数量", dataIndex: "订货数量", width: 95, align: "right", render: fmtNum },
    { title: "入仓日期", dataIndex: "入仓日期", width: 105, render: fmtDate },
    { title: "入仓单号", dataIndex: "入仓单号", width: 135, render: (v?: string) => v ? <span className="erp-num">{v}</span> : "" },
    { title: "入仓数量", dataIndex: "入仓数量", width: 95, align: "right", render: fmtNum },
    { title: "总入仓数", dataIndex: "总入仓数", width: 95, align: "right", render: fmtNum },
    { title: "相差数量", dataIndex: "相差数量", width: 95, align: "right", render: fmtNum },
    { title: "审核", dataIndex: "审核", width: 80, align: "center", render: (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
  ], []);

  const exportCols: ExportCol[] = [
    { title: "订购日期", key: "订购日期", fmt: fmtExportDate },
    { title: "交货日期", key: "交货日期", fmt: fmtExportDate },
    { title: "订购单号", key: "订购单号" },
    { title: "供应商名称", key: "供应商名称" },
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "产地", key: "产地" },
    { title: "每包重量", key: "每包重量" },
    { title: "单位", key: "单位" },
    { title: "单价类型", key: "单价类型" },
    { title: "订货数量", key: "订货数量" },
    { title: "入仓日期", key: "入仓日期", fmt: fmtExportDate },
    { title: "入仓单号", key: "入仓单号" },
    { title: "入仓数量", key: "入仓数量" },
    { title: "总入仓数", key: "总入仓数" },
    { title: "相差数量", key: "相差数量" },
    { title: "审核", key: "审核" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];
  const sum = (k: keyof PlasticRawMaterialProgressDetailRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“原料进度明细表·打开”权限）。</div></Card>;
  }

  return (
    <Card title="原料进度明细表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={arrivalStatus} style={{ width: 110 }} onChange={setArrivalStatus}
          options={["全部", "未到", "已到"].map(v => ({ value: v, label: v }))} />
        <Select value={dateType} style={{ width: 130 }} onChange={setDateType}
          options={["不选择日期", "订购日期", "交货日期", "入仓日期"].map(v => ({ value: v, label: v }))} />
        <DatePicker.RangePicker value={range} allowClear={false} disabled={dateType === "不选择日期"}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="订购单号/供应商/原料编号/名称" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 280 }} />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={() => downloadCsv("原料进度明细表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料进度明细表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table
        rowKey={(_, i) => String(i)}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content" }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={10}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{sum("订货数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={11} />
              <Table.Summary.Cell index={12} />
              <Table.Summary.Cell index={13} align="right"><b>{sum("入仓数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={14} align="right"><b>{sum("总入仓数")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={15} align="right"><b>{sum("相差数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={16} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
}
