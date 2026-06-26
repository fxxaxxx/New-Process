import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { plasticCustomerTypeApi, type PlasticCustomerTypeStatRow } from "../../api/plasticCustomerType";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "塑胶类型客户统计";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

interface PivotRow { 客户: string; cells: Record<string, { 数量: number; 金额: number }>; 总数量: number; 总金额: number }

export default function PlasticCustomerTypeStatsPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const 金额Hidden = !can(perms, MENU, "金额");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [客户, set客户] = useState("");
  const [rows, setRows] = useState<PlasticCustomerTypeStatRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticCustomerTypeApi.list(
        range[0].format("YYYY-MM-DD"), range[1].format("YYYY-MM-DD"), 客户 || undefined));
    } catch { message.error("加载塑胶类型客户统计失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, 客户]);
  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const types = useMemo(
    () => Array.from(new Set(rows.map(r => r.类型 ?? "未分类"))).sort((a, b) => a.localeCompare(b)),
    [rows]);

  const pivot = useMemo<PivotRow[]>(() => {
    const m: Record<string, PivotRow> = {};
    for (const r of rows) {
      const k = r.客户 ?? "";
      (m[k] ??= { 客户: k, cells: {}, 总数量: 0, 总金额: 0 });
      const t = r.类型 ?? "未分类";
      const q = Number(r.数量 ?? 0), a = Number(r.金额 ?? 0);
      m[k].cells[t] = { 数量: q, 金额: a };
      m[k].总数量 += q; m[k].总金额 += a;
    }
    return Object.values(m).sort((x, y) => x.客户.localeCompare(y.客户));
  }, [rows]);

  const fix1 = (v: number) => Number(v).toFixed(1);
  const columns = useMemo<ColumnsType<PivotRow>>(() => [
    { title: "客户", dataIndex: "客户", fixed: "left" as const, width: 150, render: (_: unknown, r: PivotRow) => r.客户 },
    ...types.map(t => ({
      title: t,
      children: [
        { title: "本月数量", key: `${t}_q`, align: "right" as const, width: 90, render: (_: unknown, r: PivotRow) => r.cells[t]?.数量 ?? 0 },
        ...(金额Hidden ? [] : [{ title: "本月金额", key: `${t}_a`, align: "right" as const, width: 110, render: (_: unknown, r: PivotRow) => fix1(r.cells[t]?.金额 ?? 0) }]),
      ],
    })),
    {
      title: "总合计",
      children: [
        { title: "总数量", key: "_tq", align: "right" as const, width: 100, render: (_: unknown, r: PivotRow) => <b>{r.总数量}</b> },
        ...(金额Hidden ? [] : [{ title: "总金额", key: "_ta", align: "right" as const, width: 120, render: (_: unknown, r: PivotRow) => <b>{fix1(r.总金额)}</b> }]),
      ],
    },
  ], [types, 金额Hidden]);

  const typeQ = (t: string) => pivot.reduce((s, r) => s + (r.cells[t]?.数量 ?? 0), 0);
  const typeA = (t: string) => pivot.reduce((s, r) => s + (r.cells[t]?.金额 ?? 0), 0);
  const grandQ = pivot.reduce((s, r) => s + r.总数量, 0);
  const grandA = pivot.reduce((s, r) => s + r.总金额, 0);

  const exportCols: ExportCol[] = useMemo(() => [
    { title: "客户", key: "客户" },
    ...types.flatMap(t => 金额Hidden
      ? [{ title: `${t}-数量`, key: `${t}__q` }]
      : [{ title: `${t}-数量`, key: `${t}__q` }, { title: `${t}-金额`, key: `${t}__a` }]),
    { title: "总数量", key: "总数量" },
    ...(金额Hidden ? [] : [{ title: "总金额", key: "总金额" }]),
  ], [types, 金额Hidden]);
  const exportRows = useMemo(() => pivot.map(r => {
    const o: Record<string, unknown> = { 客户: r.客户, 总数量: r.总数量, 总金额: r.总金额 };
    for (const t of types) { o[`${t}__q`] = r.cells[t]?.数量 ?? 0; o[`${t}__a`] = r.cells[t]?.金额 ?? 0; }
    return o;
  }), [pivot, types]);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶类型客户统计·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶类型客户统计" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="客户" allowClear value={客户}
          onChange={e => set客户(e.target.value)} onSearch={load} style={{ width: 200 }} />
        <Select value="默认" disabled options={[{ value: "默认", label: "货币:默认" }]} style={{ width: 120 }} />
        <Button onClick={() => downloadCsv("塑胶类型客户统计.csv", exportCols, exportRows)}>导出EXCEL</Button>
        <Button onClick={() => printTable("塑胶类型客户统计", exportCols, exportRows)}>打印</Button>
      </Space>
      <Table rowKey="客户" size="small" loading={loading} dataSource={pivot} columns={columns}
        scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 客户` }}
        summary={() => {
          let idx = 0;
          const cells = [<Table.Summary.Cell key="lbl" index={idx++}><b>总合计</b></Table.Summary.Cell>];
          for (const t of types) {
            cells.push(<Table.Summary.Cell key={`${t}q`} index={idx++} align="right"><b>{typeQ(t)}</b></Table.Summary.Cell>);
            if (!金额Hidden) cells.push(<Table.Summary.Cell key={`${t}a`} index={idx++} align="right"><b>{fix1(typeA(t))}</b></Table.Summary.Cell>);
          }
          cells.push(<Table.Summary.Cell key="gq" index={idx++} align="right"><b>{grandQ}</b></Table.Summary.Cell>);
          if (!金额Hidden) cells.push(<Table.Summary.Cell key="ga" index={idx++} align="right"><b>{fix1(grandA)}</b></Table.Summary.Cell>);
          return <Table.Summary fixed><Table.Summary.Row>{cells}</Table.Summary.Row></Table.Summary>;
        }} />
    </Card>
  );
}
