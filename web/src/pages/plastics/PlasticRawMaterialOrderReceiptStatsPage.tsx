import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  plasticRawMaterialOrderReceiptStatsApi,
  type PlasticRawMaterialOrderReceiptStatRow,
} from "../../api/plasticRawMaterialOrderReceiptStats";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料订货入库统计";
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtExportDate = (v: unknown) => fmtDate(typeof v === "string" ? v : undefined);
const fmtMoney = (v?: number | null) => (v == null ? "" : Number(v).toFixed(2));
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));

export default function PlasticRawMaterialOrderReceiptStatsPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialOrderReceiptStatRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticRawMaterialOrderReceiptStatsApi.list(
        range[0].format("YYYY-MM-DD"),
        range[1].format("YYYY-MM-DD"),
        keyword.trim() || undefined,
      ));
    } catch {
      message.error("加载原料订货入库统计失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, range, keyword]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<PlasticRawMaterialOrderReceiptStatRow> = useMemo(() => [
    { title: "订购日期", dataIndex: "订购日期", width: 100, render: fmtDate },
    { title: "交货日期", dataIndex: "交货日期", width: 100, render: fmtDate },
    { title: "订购单号", dataIndex: "订购单号", width: 120, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "供应商名称", dataIndex: "供应商名称", width: 150 },
    { title: "原料编号", dataIndex: "原料编号", width: 110 },
    { title: "原料名称", dataIndex: "原料名称", width: 170 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "采购单价", dataIndex: "采购单价", width: 100, align: "right", render: fmtMoney },
    { title: "单价 HK$/Lb", dataIndex: "单价HKDLb", width: 100, align: "right", render: fmtMoney },
    { title: "其他成本单价(HK$/Lb)", dataIndex: "其他成本单价HKDLb", width: 150, align: "right", render: fmtMoney },
    {
      title: "订货情况",
      children: [
        { title: "数量(包)", dataIndex: "订货数量包", width: 100, align: "right", render: fmtNum },
        { title: "金额(HK$)", dataIndex: "订货金额HKD", width: 110, align: "right", render: fmtMoney },
      ],
    },
    {
      title: "入库情况",
      children: [
        { title: "数量(包)", dataIndex: "入库数量包", width: 100, align: "right", render: fmtNum },
        { title: "订货金额(HK$)", dataIndex: "入库订货金额HKD", width: 120, align: "right", render: fmtMoney },
        { title: "其他费用(HK$)", dataIndex: "入库其他费用HKD", width: 120, align: "right", render: fmtMoney },
        { title: "金额合计(HK$)", dataIndex: "入库金额合计HKD", width: 120, align: "right", render: fmtMoney },
      ],
    },
    {
      title: "相关情况",
      children: [
        { title: "数量(包)", dataIndex: "相关数量包", width: 100, align: "right", render: fmtNum },
        { title: "金额(HK$)", dataIndex: "相关金额HKD", width: 110, align: "right", render: fmtMoney },
      ],
    },
  ], []);

  const exportCols: ExportCol[] = [
    { title: "订购日期", key: "订购日期", fmt: fmtExportDate },
    { title: "交货日期", key: "交货日期", fmt: fmtExportDate },
    { title: "订购单号", key: "订购单号" },
    { title: "供应商名称", key: "供应商名称" },
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "单位", key: "单位" },
    { title: "采购单价", key: "采购单价" },
    { title: "单价HK$/Lb", key: "单价HKDLb" },
    { title: "其他成本单价(HK$/Lb)", key: "其他成本单价HKDLb" },
    { title: "订货数量(包)", key: "订货数量包" },
    { title: "订货金额(HK$)", key: "订货金额HKD" },
    { title: "入库数量(包)", key: "入库数量包" },
    { title: "入库订货金额(HK$)", key: "入库订货金额HKD" },
    { title: "入库其他费用(HK$)", key: "入库其他费用HKD" },
    { title: "入库金额合计(HK$)", key: "入库金额合计HKD" },
    { title: "相关数量(包)", key: "相关数量包" },
    { title: "相关金额(HK$)", key: "相关金额HKD" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];
  const sum = (k: keyof PlasticRawMaterialOrderReceiptStatRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料订货入库统计·打开"权限）。</div></Card>;
  }

  return (
    <Card title="原料订货入库统计" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="订购单号/供应商/原料编号/名称" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 280 }} />
        <Button onClick={() => downloadCsv("原料订货入库统计.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料订货入库统计", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={10}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{sum("订货数量包")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={11} align="right"><b>{fmtMoney(sum("订货金额HKD"))}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={12} align="right"><b>{sum("入库数量包")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={13} align="right"><b>{fmtMoney(sum("入库订货金额HKD"))}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={14} align="right"><b>{fmtMoney(sum("入库其他费用HKD"))}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={15} align="right"><b>{fmtMoney(sum("入库金额合计HKD"))}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={16} align="right"><b>{sum("相关数量包")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={17} align="right"><b>{fmtMoney(sum("相关金额HKD"))}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )} />
    </Card>
  );
}
