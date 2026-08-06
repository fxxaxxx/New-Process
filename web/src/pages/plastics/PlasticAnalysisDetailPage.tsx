import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { plasticAnalysisApi, type PlasticAnalysisDetailRow } from "../../api/plasticAnalysis";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "塑胶分析明细查询";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticAnalysisDetailPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [完成, set完成] = useState<string>("");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticAnalysisDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticAnalysisApi.list(
        range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD"),
        keyword || undefined, 完成 || undefined));
    } catch { message.error("加载塑胶分析明细查询失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, keyword, 完成]);
  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns = [
    { title: "日期", dataIndex: "日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "货号", dataIndex: "货号", width: 110 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "材料", dataIndex: "材料", width: 80 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "加工内容", dataIndex: "加工内容", width: 100 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "加工单价", dataIndex: "加工单价", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: (v?: number | null) => (v == null ? "" : Number(v).toFixed(2)) },
    ]),
    { title: "完成", dataIndex: "完成", width: 70 },
  ];

  const 数量合计 = rows.reduce((s, r) => s + Number(r.数量 ?? 0), 0);
  const 金额合计 = rows.reduce((s, r) => s + Number(r.金额 ?? 0), 0);

  const exportCols: ExportCol[] = [
    { title: "日期", key: "日期", fmt: v => String(v ?? "").slice(0, 10) },
    { title: "生产单号", key: "生产单号" }, { title: "款号", key: "款号" }, { title: "货号", key: "货号" },
    { title: "物料编号", key: "物料编号" }, { title: "物料名称", key: "物料名称" }, { title: "颜色", key: "颜色" },
    { title: "材料", key: "材料" }, { title: "单位", key: "单位" }, { title: "加工内容", key: "加工内容" }, { title: "数量", key: "数量" },
    ...(priceHidden ? [] : [{ title: "加工单价", key: "加工单价" }, { title: "金额", key: "金额" }]),
    { title: "完成", key: "完成" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶分析明细查询·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶分析明细查询" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Select value={完成} onChange={set完成} style={{ width: 120 }}
          options={[{ value: "", label: "完成:全部" }, { value: "是", label: "已完成" }, { value: "否", label: "未完成" }]} />
        <Input.Search placeholder="生产单号/款号/货号/物料" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
        <Button onClick={() => downloadCsv("塑胶分析明细查询.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("塑胶分析明细查询", exportCols, asRecords())}>打印</Button>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={10}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{数量合计}</b></Table.Summary.Cell>
              {!priceHidden && <Table.Summary.Cell index={11} />}
              {!priceHidden && <Table.Summary.Cell index={12} align="right"><b>{金额合计.toFixed(2)}</b></Table.Summary.Cell>}
              <Table.Summary.Cell index={priceHidden ? 11 : 13} />
            </Table.Summary.Row>
          </Table.Summary>
        )} />
    </Card>
  );
}
