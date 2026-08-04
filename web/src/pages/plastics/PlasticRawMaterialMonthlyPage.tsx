import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialApi, type PlasticRawMaterialMonthlyRow } from "../../api/plasticRawMaterial";
import { plasticRawMaterialMasterApi, type PlasticRawMaterialCategoryNode } from "../../api/plasticRawMaterialMaster";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料库存月报表";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticRawMaterialMonthlyPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [cats, setCats] = useState<PlasticRawMaterialCategoryNode[]>([]);
  const [cat, setCat] = useState("");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialMonthlyRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canOpen) plasticRawMaterialMasterApi.categories().then(setCats).catch(() => { /* 取类别失败不阻塞 */ });
  }, [canOpen]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticRawMaterialApi.monthly(
        range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD"),
        cat || undefined, keyword || undefined));
    } catch { message.error("加载原料库存月报表失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, cat, keyword]);
  useEffect(() => { load(); }, [canOpen, range, cat]); // eslint-disable-line react-hooks/exhaustive-deps

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns: ColumnsType<PlasticRawMaterialMonthlyRow> = [
    { title: "原料编号", dataIndex: "原料编号", width: 120 },
    { title: "原料名称", dataIndex: "原料名称", width: 170 },
    { title: "产地", dataIndex: "产地", width: 110 },
    { title: "每包重量", dataIndex: "每包重量", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "物料类别", dataIndex: "物料类别", width: 100 },
    { title: "期初库存", dataIndex: "期初库存", width: 110, align: "right" as const },
    { title: "本期入库", dataIndex: "本期入库", width: 110, align: "right" as const, render: (v: number) => <span style={{ color: v > 0 ? "#389e0d" : undefined }}>{v}</span> },
    { title: "本期出库", dataIndex: "本期出库", width: 110, align: "right" as const, render: (v: number) => <span style={{ color: v > 0 ? "#cf1322" : undefined }}>{v}</span> },
    { title: "盘点盈亏", dataIndex: "盘点盈亏", width: 110, align: "right" as const, render: (v: number) => <span style={{ color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
    { title: "期末库存", dataIndex: "期末库存", width: 110, align: "right" as const, render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
    { title: "外发库存", dataIndex: "外发库存", width: 110, align: "right" as const },
  ];

  const sum = (k: keyof PlasticRawMaterialMonthlyRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const exportCols: ExportCol[] = [
    { title: "原料编号", key: "原料编号" }, { title: "原料名称", key: "原料名称" },
    { title: "产地", key: "产地" }, { title: "每包重量", key: "每包重量" }, { title: "单位", key: "单位" },
    { title: "物料类别", key: "物料类别" }, { title: "期初库存", key: "期初库存" },
    { title: "本期入库", key: "本期入库" }, { title: "本期出库", key: "本期出库" },
    { title: "盘点盈亏", key: "盘点盈亏" }, { title: "期末库存", key: "期末库存" }, { title: "外发库存", key: "外发库存" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料库存月报表·打开"权限）。</div></Card>;
  }

  return (
    <Card title="原料库存月报表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Select value={cat} onChange={setCat} style={{ width: 160 }}
          options={[{ value: "", label: "全部类别" }, ...cats.filter(x => x.类别).map(x => ({ value: x.类别!, label: `${x.类别}(${x.数量})` }))]} />
        <Input.Search placeholder="原料编号/名称/产地" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
        <Button onClick={() => downloadCsv("原料库存月报表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料库存月报表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><b>{sum("期初库存")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={7} align="right"><b>{sum("本期入库")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><b>{sum("本期出库")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right"><b>{sum("盘点盈亏")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{sum("期末库存")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={11} align="right"><b>{sum("外发库存")}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )} />
    </Card>
  );
}
