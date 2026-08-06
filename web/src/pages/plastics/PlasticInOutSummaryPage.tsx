import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Table, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { plasticInOutSummaryApi, type PlasticInOutSummaryRow } from "../../api/plasticInOutSummary";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "塑胶物料进出汇总";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticInOutSummaryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [物料类别, set物料类别] = useState("");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticInOutSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticInOutSummaryApi.list(
        range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD"),
        物料类别 || undefined, keyword || undefined));
    } catch { message.error("加载塑胶物料进出汇总失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, 物料类别, keyword]);
  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "材料", dataIndex: "物料类别", width: 90 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "入仓", dataIndex: "入仓", width: 90, align: "right" as const },
    { title: "退仓", dataIndex: "退仓", width: 90, align: "right" as const },
    { title: "领料", dataIndex: "领料", width: 90, align: "right" as const },
    { title: "退料", dataIndex: "退料", width: 90, align: "right" as const },
    { title: "报废", dataIndex: "报废", width: 90, align: "right" as const },
    { title: "盘点盈亏", dataIndex: "盘点盈亏", width: 90, align: "right" as const,
      render: (v: number) => <span style={{ color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
  ];

  const sum = (k: keyof PlasticInOutSummaryRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const exportCols: ExportCol[] = [
    { title: "物料编号", key: "物料编号" }, { title: "物料名称", key: "物料名称" }, { title: "规格", key: "规格" },
    { title: "颜色", key: "颜色" }, { title: "材料", key: "物料类别" }, { title: "单位", key: "单位" },
    { title: "入仓", key: "入仓" }, { title: "退仓", key: "退仓" }, { title: "领料", key: "领料" },
    { title: "退料", key: "退料" }, { title: "报废", key: "报废" }, { title: "盘点盈亏", key: "盘点盈亏" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶物料进出汇总·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶物料进出汇总" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input placeholder="物料类别" allowClear value={物料类别} onChange={e => set物料类别(e.target.value)} onPressEnter={load} style={{ width: 120 }} />
        <Input.Search placeholder="物料编号/名称/规格" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 220 }} />
        <Button onClick={() => downloadCsv("塑胶物料进出汇总.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("塑胶物料进出汇总", exportCols, asRecords())}>打印</Button>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><b>{sum("入仓")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><b>{sum("退仓")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><b>{sum("领料")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right"><b>{sum("退料")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{sum("报废")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={11} align="right"><b>{sum("盘点盈亏")}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )} />
    </Card>
  );
}
