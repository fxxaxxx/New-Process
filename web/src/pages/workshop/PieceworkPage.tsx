import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, InputNumber, Popconfirm, Select, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { productionApi, type ProductionHeader } from "../../api/production";
import { masterApi } from "../../api/master";
import { pieceworkApi, type PieceLineDto, type PieceRow } from "../../api/piecework";
import { validPieceLines } from "../../utils/pieceLines";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "计件";
interface Proc { 工序号?: string; 工序名称?: string }
interface Emp { 编号?: string; 姓名?: string }

export default function PieceworkPage() {
  const perms = usePerms();
  const [orders, setOrders] = useState<ProductionHeader[]>([]);
  const [生产单号, set生产单号] = useState<string>();
  const [procs, setProcs] = useState<Proc[]>([]);
  const [emps, setEmps] = useState<Emp[]>([]);
  const [lines, setLines] = useState<PieceLineDto[]>([]);
  const [rows, setRows] = useState<PieceRow[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setOrders((await productionApi.list(1, 200)).items);
        setEmps((await masterApi("employees").list(1, 500)).items as Emp[]);
      } catch { message.error("加载生产制单/人事失败"); }
    })();
  }, []);

  const loadRows = useCallback(async () => {
    if (!生产单号) { setRows([]); return; }
    try { setRows(await pieceworkApi.list(生产单号)); }
    catch { message.error("加载计件记录失败"); }
  }, [生产单号]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const onOrderChange = async (v: string) => {
    set生产单号(v); setLines([]);
    try {
      const d = await productionApi.get(v);
      setProcs(d.工序.map(p => ({ 工序号: p.工序号, 工序名称: p.工序名称 })));
    } catch { message.error("加载工序失败"); }
  };

  const setLine = (i: number, patch: Partial<PieceLineDto>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    if (!生产单号) { message.error("请先选择生产制单"); return; }
    const ok = validPieceLines(lines) as PieceLineDto[];
    if (ok.length === 0) { message.error("请录入工序/工人/数量"); return; }
    setSaving(true);
    try {
      const r = await pieceworkApi.record({ 生产单号, 明细: ok });
      message.success(`已录入 ${r.录入条数} 条计件`); setLines([]); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "录入失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const priceHidden = !can(perms, MENU, "单价");
  const editColumns = [
    { title: "工序", dataIndex: "工序号", width: 160, render: (_: unknown, r: PieceLineDto, i: number) =>
      <Select style={{ width: 150 }} value={r.工序号 || undefined} placeholder="工序"
        onChange={(v: string) => setLine(i, { 工序号: v })}
        options={procs.map(p => ({ value: String(p.工序号), label: `${p.工序号} ${p.工序名称 ?? ""}` }))} /> },
    { title: "工人", dataIndex: "员工号", width: 160, render: (_: unknown, r: PieceLineDto, i: number) =>
      <Select showSearch optionFilterProp="label" style={{ width: 150 }} value={r.员工号 || undefined} placeholder="工人"
        onChange={(v: string) => setLine(i, { 员工号: v })}
        options={emps.map(e => ({ value: String(e.编号), label: `${e.编号} ${e.姓名 ?? ""}` }))} /> },
    { title: "颜色", dataIndex: "颜色", width: 100, render: (_: unknown, r: PieceLineDto, i: number) =>
      <Input style={{ width: 90 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} /> },
    { title: "尺码", dataIndex: "尺码", width: 90, render: (_: unknown, r: PieceLineDto, i: number) =>
      <Input style={{ width: 80 }} value={r.尺码 ?? ""} onChange={e => setLine(i, { 尺码: e.target.value })} /> },
    { title: "数量", dataIndex: "数量", width: 110, render: (_: unknown, r: PieceLineDto, i: number) =>
      <InputNumber min={0} precision={0} style={{ width: 96 }} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: PieceLineDto, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];

  const listColumns = [
    { title: "工序", dataIndex: "工序名称", key: "工序名称", render: (v: string, r: PieceRow) => v ?? r.工序号 },
    { title: "工人", dataIndex: "姓名", key: "姓名", render: (v: string, r: PieceRow) => v ?? r.员工号 },
    { title: "颜色", dataIndex: "颜色", key: "颜色" },
    { title: "尺码", dataIndex: "尺码", key: "尺码" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", key: "单价" },
      { title: "金额", dataIndex: "金额", key: "金额" },
    ]),
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: PieceRow) => (row.审核 !== "1" && can(perms, MENU, "删除")
        ? <Popconfirm title="确认删除该计件?" onConfirm={() => act(() => pieceworkApi.remove(row.id), "已删除")}><a>删除</a></Popconfirm>
        : null),
    },
  ];

  return (
    <Card title="计件录入" variant="borderless"
      extra={
        <Space>
          <Select showSearch optionFilterProp="label" placeholder="选择生产制单" style={{ width: 280 }}
            value={生产单号} onChange={onOrderChange}
            options={orders.map(o => ({ value: String(o.生产单号), label: `${o.生产单号} ${o.款式 ?? ""}` }))} />
          {生产单号 && can(perms, MENU, "审核") && (
            <Button onClick={() => act(() => pieceworkApi.approve(生产单号), "已批量审核")}>批量审核</Button>
          )}
        </Space>
      }>
      {生产单号 && can(perms, MENU, "保存") && (
        <div style={{ marginBottom: 16 }}>
          <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={editColumns} />
          <Space style={{ marginTop: 12 }}>
            <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 工序号: "", 员工号: "", 数量: 0 }])}>加一行</Button>
            <Button type="primary" loading={saving} onClick={submit}>提交计件</Button>
          </Space>
        </div>
      )}
      <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 15 }} />
    </Card>
  );
}
