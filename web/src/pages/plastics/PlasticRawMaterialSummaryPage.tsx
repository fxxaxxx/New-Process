import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Table, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { plasticRawMaterialApi, type PlasticRawMaterialSummaryRow } from "../../api/plasticRawMaterial";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料本月库存汇总";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticRawMaterialSummaryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticRawMaterialApi.list(
        range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD"), keyword || undefined));
    } catch { message.error("加载原料本月库存汇总失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, keyword]);
  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns = [
    { title: "原料名称", dataIndex: "原料名称", width: 240 },
    { title: "本月库存", dataIndex: "本月库存", width: 120, align: "right" as const,
      render: (v: number) => <span style={{ color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
    { title: "存外厂数量", dataIndex: "存外厂数量", width: 120, align: "right" as const },
    { title: "本月报废", dataIndex: "本月报废", width: 120, align: "right" as const,
      render: (v: number) => <span style={{ color: v > 0 ? "#cf1322" : undefined }}>{v}</span> },
    { title: "本月总数", dataIndex: "本月总数", width: 120, align: "right" as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
  ];

  const sum = (k: keyof PlasticRawMaterialSummaryRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const exportCols: ExportCol[] = [
    { title: "原料名称", key: "原料名称" }, { title: "本月库存", key: "本月库存" },
    { title: "存外厂数量", key: "存外厂数量" }, { title: "本月报废", key: "本月报废" }, { title: "本月总数", key: "本月总数" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料本月库存汇总·打开"权限）。</div></Card>;
  }

  return (
    <Card title="原料本月库存汇总" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="原料名称" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 220 }} />
        <Button onClick={() => downloadCsv("原料本月库存汇总.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料本月库存汇总", exportCols, asRecords())}>打印</Button>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right"><b>{sum("本月库存")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={2} align="right"><b>{sum("存外厂数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={3} align="right"><b>{sum("本月报废")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={4} align="right"><b>{sum("本月总数")}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )} />
    </Card>
  );
}
