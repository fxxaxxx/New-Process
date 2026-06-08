import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input, InputNumber, Popconfirm,
  Row, Space, Statistic, Table, Tag, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { outsourcePaymentApi, type OPDetail, type OPHeader, type OPLine } from "../../api/payables";
import { sumPay } from "../../utils/payLines";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "发外付款";

export default function OutsourcePaymentPage() {
  const perms = usePerms();
  const showAmount = can(perms, MENU, "金额");
  const [rows, setRows] = useState<OPHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await outsourcePaymentApi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { message.error("加载发外付款单失败"); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const columns = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "发外单号", dataIndex: "发外单号", key: "发外单号" },
    ...(showAmount ? [{ title: "金额", dataIndex: "金额", key: "金额", render: (v?: number | null) => (v == null ? "***" : v) }] : []),
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: OPHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => outsourcePaymentApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => outsourcePaymentApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该付款单?" onConfirm={() => act(() => outsourcePaymentApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="发外付款" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索单号/发外单号" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          {can(perms, MENU, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建付款单</Button>}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns} scroll={{ x: true }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <CreateDrawer open={creating} showAmount={showAmount} onClose={() => setCreating(false)} onCreated={load} />
      <DetailDrawer 单号={viewing} showAmount={showAmount} onClose={() => setViewing(null)} />
    </Card>
  );
}

function CreateDrawer({ open, showAmount, onClose, onCreated }: {
  open: boolean; showAmount: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form] = Form.useForm<{ 发外单号?: string; 备注?: string }>();
  const [lines, setLines] = useState<OPLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) return; form.resetFields(); setLines([]); }, [open, form]);

  const setLine = (i: number, patch: Partial<OPLine>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    let v: { 发外单号?: string; 备注?: string };
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => Number(l.付款金额) > 0);
    if (ok.length === 0) { message.error("请至少录入一行付款金额>0的明细"); return; }
    setSaving(true);
    try {
      await outsourcePaymentApi.create({ ...v, 明细: ok });
      message.success("发外付款单已创建"); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建付款单失败");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "加工厂编号", dataIndex: "加工厂编号", width: 160, render: (_: unknown, r: OPLine, i: number) =>
      <Input style={{ width: 144 }} value={r.加工厂编号 ?? ""} onChange={e => setLine(i, { 加工厂编号: e.target.value })} /> },
    { title: "加工厂名称", dataIndex: "加工厂名称", width: 200, render: (_: unknown, r: OPLine, i: number) =>
      <Input style={{ width: 184 }} value={r.加工厂名称 ?? ""} onChange={e => setLine(i, { 加工厂名称: e.target.value })} /> },
    { title: "付款金额", dataIndex: "付款金额", width: 140, render: (_: unknown, r: OPLine, i: number) =>
      <InputNumber min={0} style={{ width: 124 }} value={r.付款金额 ?? 0} onChange={n => setLine(i, { 付款金额: Number(n ?? 0) })} /> },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: OPLine, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];

  return (
    <Drawer title="新建发外付款单" width={820} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}><Form.Item name="发外单号" label="发外单号"><Input placeholder="可选,关联发外回收单" /></Form.Item></Col>
          <Col span={16}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={columns} />
      <Space style={{ marginTop: 12 }} size={24}>
        <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 付款金额: 0 }])}>加一行</Button>
        {showAmount && <Statistic title="付款金额合计" value={sumPay(lines)} />}
      </Space>
    </Drawer>
  );
}

function DetailDrawer({ 单号, showAmount, onClose }: { 单号: string | null; showAmount: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<OPDetail | null>(null);
  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => { try { setDetail(await outsourcePaymentApi.get(单号)); } catch { message.error("加载付款详情失败"); } })();
  }, [单号]);
  const h = detail?.单头;
  return (
    <Drawer title={`发外付款单 ${单号 ?? ""}`} width={820} open={!!单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "单号", children: h?.单号 ?? "-" },
              { key: "src", label: "发外单号", children: h?.发外单号 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              ...(showAmount ? [{ key: "amt", label: "金额", children: h?.金额 == null ? "***" : String(h?.金额) }] : []),
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细}
            columns={[
              { title: "加工厂编号", dataIndex: "加工厂编号" }, { title: "加工厂名称", dataIndex: "加工厂名称" },
              ...(showAmount ? [
                { title: "货款金额", dataIndex: "货款金额", render: (v?: number | null) => (v == null ? "***" : v) },
                { title: "付款金额", dataIndex: "付款金额", render: (v?: number | null) => (v == null ? "***" : v) },
                { title: "应付金额", dataIndex: "应付金额", render: (v?: number | null) => (v == null ? "***" : v) },
              ] : []),
              { title: "备注", dataIndex: "备注" },
            ]} />
        </>
      )}
    </Drawer>
  );
}
