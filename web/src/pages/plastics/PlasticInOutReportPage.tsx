import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Table, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { plasticInOutApi, type PlasticInOutRow } from "../../api/plasticInOut";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "塑胶进出库统计表";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticInOutReportPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [仓库, set仓库] = useState("");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticInOutRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticInOutApi.list(
        range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD"),
        仓库 || undefined, keyword || undefined));
    } catch { message.error("加载塑胶进出库统计表失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, 仓库, keyword]);
  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "材料", dataIndex: "物料类别", width: 90 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "仓库", dataIndex: "仓库", width: 100 },
    { title: "期初数量", dataIndex: "期初数量", width: 100, align: "right" as const },
    { title: "本期入库", dataIndex: "本期入库", width: 100, align: "right" as const, render: (v: number) => <span style={{ color: "#389e0d" }}>{v}</span> },
    { title: "本期出库", dataIndex: "本期出库", width: 100, align: "right" as const, render: (v: number) => <span style={{ color: "#cf1322" }}>{v}</span> },
    { title: "期末数量", dataIndex: "期末数量", width: 100, align: "right" as const, render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
  ];

  const sum = (k: keyof PlasticInOutRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const exportCols: ExportCol[] = [
    { title: "物料编号", key: "物料编号" }, { title: "物料名称", key: "物料名称" }, { title: "规格", key: "规格" },
    { title: "颜色", key: "颜色" }, { title: "材料", key: "物料类别" }, { title: "单位", key: "单位" }, { title: "仓库", key: "仓库" },
    { title: "期初数量", key: "期初数量" }, { title: "本期入库", key: "本期入库" }, { title: "本期出库", key: "本期出库" }, { title: "期末数量", key: "期末数量" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶进出库统计表·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶进出库统计表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input placeholder="仓库" allowClear value={仓库} onChange={e => set仓库(e.target.value)} onPressEnter={load} style={{ width: 120 }} />
        <Input.Search placeholder="物料编号/名称/规格" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 220 }} />
        <Button onClick={() => downloadCsv("塑胶进出库统计表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("塑胶进出库统计表", exportCols, asRecords())}>打印</Button>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={7}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><b>{sum("期初数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><b>{sum("本期入库")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right"><b>{sum("本期出库")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{sum("期末数量")}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )} />
    </Card>
  );
}
