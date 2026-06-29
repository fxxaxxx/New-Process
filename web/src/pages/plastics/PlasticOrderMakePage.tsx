import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { plasticOrderMakeApi, type PlasticOrderMakeRow } from "../../api/plasticOrderMake";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "塑胶订单制作";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticOrderMakePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticOrderMakeRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticOrderMakeApi.list({
        起: range[0].format("YYYY-MM-DD"), 止: range[1].format("YYYY-MM-DD"),
        keyword: keyword || undefined,
      }));
    } catch { message.error("加载塑胶订单制作失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, keyword]);
  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const columns: ColumnsType<PlasticOrderMakeRow> = [
    { title: "单据日期", dataIndex: "单据日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 110 },
    { title: "工模编号", dataIndex: "工模编号", width: 100 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "用料名称", dataIndex: "用料名称", width: 120 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "用量", dataIndex: "用量", width: 90, align: "right" as const },
    { title: "计划数量", dataIndex: "计划数量", width: 90, align: "right" as const },
    { title: "订购数量", dataIndex: "订购数量", width: 90, align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "加工单价", dataIndex: "加工单价", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: (v?: number | null) => (v == null ? "" : Number(v).toFixed(2)) },
    ]),
  ];

  const exportCols: ExportCol[] = [
    { title: "单据日期", key: "单据日期", fmt: v => String(v ?? "").slice(0, 10) },
    { title: "生产单号", key: "生产单号" }, { title: "款号", key: "款号" }, { title: "塑胶货号", key: "塑胶货号" },
    { title: "工模编号", key: "工模编号" }, { title: "物料编号", key: "物料编号" }, { title: "物料名称", key: "物料名称" },
    { title: "颜色", key: "颜色" }, { title: "用料名称", key: "用料名称" }, { title: "单位", key: "单位" },
    { title: "用量", key: "用量" }, { title: "计划数量", key: "计划数量" }, { title: "订购数量", key: "订购数量" },
    ...(priceHidden ? [] : [{ title: "加工单价", key: "加工单价" }, { title: "金额", key: "金额" }]),
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶订单制作·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶订单制作" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="生产单号/款号/物料" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
        <Button onClick={() => downloadCsv("塑胶订单制作.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("塑胶订单制作", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
