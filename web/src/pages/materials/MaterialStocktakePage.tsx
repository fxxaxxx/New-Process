import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, InputNumber, Popconfirm, Space, Table, Tag, message } from "antd";
import { materialStocktakeApi, type MSBasisRow, type MSHeader, type MSLine } from "../../api/materialStocktake";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "盘点单";
interface BasisRow extends MSBasisRow { 盘点数量?: number }

export default function MaterialStocktakePage() {
  const perms = usePerms();
  const [仓库, set仓库] = useState("");
  const [basis, setBasis] = useState<BasisRow[]>([]);
  const [rows, setRows] = useState<MSHeader[]>([]);
  const [saving, setSaving] = useState(false);

  const loadRows = useCallback(async () => {
    try { setRows((await materialStocktakeApi.list(1, 50, 仓库)).items); }
    catch { message.error("加载盘点单失败"); }
  }, [仓库]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const loadBasis = async () => {
    if (!仓库) { message.error("请先填仓库"); return; }
    try { const b = await materialStocktakeApi.basis(仓库); setBasis(b.map(x => ({ ...x, 盘点数量: x.系统数量 }))); }
    catch { message.error("加载库存基准失败"); }
  };
  const setQty = (i: number, val: number) =>
    setBasis(prev => prev.map((b, j) => (j === i ? { ...b, 盘点数量: val } : b)));

  const submit = async () => {
    if (!仓库) { message.error("请先填仓库"); return; }
    const 明细: MSLine[] = basis.map(b => ({
      物料编号: b.物料编号, 物料名称: b.物料名称, 规格: b.规格, 单位: b.单位,
      系统数量: b.系统数量, 盘点数量: Number(b.盘点数量 ?? b.系统数量),
    }));
    if (明细.length === 0) { message.error("无库存可盘点"); return; }
    setSaving(true);
    try {
      await materialStocktakeApi.create({ 仓库, 明细 });
      message.success("盘点单已创建"); setBasis([]); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建盘点单失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const basisColumns = [
    { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" }, { title: "单位", dataIndex: "单位" },
    { title: "系统数量", dataIndex: "系统数量" },
    { title: "盘点数量", key: "盘点数量", render: (_: unknown, r: BasisRow, i: number) =>
      <InputNumber min={0} precision={2} value={r.盘点数量 ?? 0} onChange={n => setQty(i, Number(n ?? 0))} /> },
    { title: "盈亏", key: "盈亏", render: (_: unknown, r: BasisRow) => Number(r.盘点数量 ?? r.系统数量) - r.系统数量 },
  ];
  const listColumns = [
    { title: "盘点单号", dataIndex: "单号", key: "单号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "仓库", dataIndex: "仓库", key: "仓库" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: MSHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => materialStocktakeApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => materialStocktakeApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该盘点单?" onConfirm={() => act(() => materialStocktakeApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="物料盘点" variant="borderless"
      extra={
        <Space>
          <Input placeholder="仓库" value={仓库} onChange={e => set仓库(e.target.value)} style={{ width: 140 }} />
          <Button onClick={loadBasis}>带出库存</Button>
        </Space>
      }>
      {can(perms, MENU, "保存") && basis.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={basis} columns={basisColumns} />
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" loading={saving} onClick={submit}>提交盘点</Button>
          </Space>
        </div>
      )}
      <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 10 }} />
    </Card>
  );
}
