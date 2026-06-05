import { useCallback, useEffect, useState } from "react";
import { Button, Card, InputNumber, Popconfirm, Select, Space, Table, Tag, message } from "antd";
import { outsourcingApi, outReturnApi, type OutHeader, type OutReturnBasisRow, type OutReturnHeader, type OutReturnLineDto } from "../../api/outsourcing";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "发外回收";

interface BasisRow extends OutReturnBasisRow { 本次回收?: number }

export default function OutsourceReturnPage() {
  const perms = usePerms();
  const [dispatched, setDispatched] = useState<OutHeader[]>([]);   // 已审核派工单
  const [发外单号, set发外单号] = useState<string>();
  const [basis, setBasis] = useState<BasisRow[]>([]);
  const [rows, setRows] = useState<OutReturnHeader[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await outsourcingApi.list(1, 200);
        setDispatched(r.items.filter(o => o.审核 === "1"));
      } catch { message.error("加载派工单失败"); }
    })();
  }, []);

  const loadRows = useCallback(async () => {
    try { setRows((await outReturnApi.list(1, 50, 发外单号 ?? "")).items); }
    catch { message.error("加载回收单失败"); }
  }, [发外单号]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const onDispatchChange = async (v: string) => {
    set发外单号(v); setBasis([]);
    try {
      const b = await outReturnApi.basis(v);
      setBasis(b.map(x => ({ ...x, 本次回收: x.欠数 })));   // 默认回收数=欠数
    } catch { message.error("加载发外基准失败"); }
  };

  const setBasisQty = (i: number, val: number) =>
    setBasis(prev => prev.map((b, j) => (j === i ? { ...b, 本次回收: val } : b)));

  const submit = async () => {
    if (!发外单号) { message.error("请先选择发外单"); return; }
    const picked = dispatched.find(o => o.单号 === 发外单号);
    const 明细: OutReturnLineDto[] = basis
      .filter(b => Number(b.本次回收 ?? 0) > 0)
      .map(b => ({
        生产单号: b.生产单号, 款号: b.款号, 款式: b.款式, 加工项目: b.加工项目 ?? "",
        色号: b.色号, 颜色: b.颜色, 尺码: b.尺码, 发外数量: b.发外数量, 回收数量: Number(b.本次回收),
      }));
    if (明细.length === 0) { message.error("请录入至少一行回收数量"); return; }
    setSaving(true);
    try {
      await outReturnApi.create({
        发外单号, 加工厂编号: picked?.加工厂编号 ?? "", 加工厂名称: picked?.加工厂名称, 仓库: picked?.仓库, 明细,
      });
      message.success("发外回收单已创建"); setBasis([]); set发外单号(undefined); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建回收单失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const basisColumns = [
    { title: "款号", dataIndex: "款号" }, { title: "加工项目", dataIndex: "加工项目" },
    { title: "颜色", dataIndex: "颜色" }, { title: "尺码", dataIndex: "尺码" },
    { title: "发外数量", dataIndex: "发外数量" }, { title: "已回收", dataIndex: "已回收" },
    { title: "欠数", dataIndex: "欠数" },
    { title: "本次回收", key: "本次回收", render: (_: unknown, r: BasisRow, i: number) =>
      <InputNumber min={0} precision={0} value={r.本次回收 ?? 0} onChange={n => setBasisQty(i, Number(n ?? 0))} /> },
  ];

  const listColumns = [
    { title: "回收单号", dataIndex: "单号", key: "单号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "发外单号", dataIndex: "发外单号", key: "发外单号", render: (v?: string) => v && <span className="erp-num">{v}</span> },
    { title: "发外数量", dataIndex: "发外数量", key: "发外数量" },
    { title: "回收数量", dataIndex: "回收数量", key: "回收数量" },
    { title: "相差", dataIndex: "相差数量", key: "相差数量" },
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: OutReturnHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => outReturnApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => outReturnApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该回收单?" onConfirm={() => act(() => outReturnApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="发外回收" variant="borderless"
      extra={
        <Select showSearch optionFilterProp="label" placeholder="选择已审核发外单" style={{ width: 300 }}
          value={发外单号} onChange={onDispatchChange}
          options={dispatched.map(o => ({ value: String(o.单号), label: `${o.单号} ${o.加工厂名称 ?? ""}` }))} />
      }>
      {发外单号 && can(perms, MENU, "保存") && basis.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={basis} columns={basisColumns} />
          <Space style={{ marginTop: 12 }}>
            <Button type="primary" loading={saving} onClick={submit}>提交回收</Button>
          </Space>
        </div>
      )}
      <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }} />
    </Card>
  );
}
