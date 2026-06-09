import { useCallback, useEffect, useState, type Key } from "react";
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input, InputNumber, Modal, Popconfirm,
  Row, Space, Statistic, Table, Tag, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  receivablesApi, salesReceiptApi,
  type SKDetail, type SKHeader, type SKLine, type UnsettledShipmentRow,
} from "../../api/sales";
import { sumReceipt } from "../../utils/salesLines";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "销售收款";

export default function SalesReceiptPage() {
  const perms = usePerms();
  const showAmount = can(perms, MENU, "金额");
  const [rows, setRows] = useState<SKHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await salesReceiptApi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { message.error("加载销售收款单失败"); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const columns = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "出仓单号", dataIndex: "出仓单号", key: "出仓单号" },
    ...(showAmount ? [{ title: "金额", dataIndex: "金额", key: "金额", render: (v?: number | null) => (v == null ? "***" : v) }] : []),
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: SKHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => salesReceiptApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => salesReceiptApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该收款单?" onConfirm={() => act(() => salesReceiptApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="销售收款" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索单号/出仓单号" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          {can(perms, MENU, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建收款单</Button>}
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
  const [form] = Form.useForm<{ 出仓单号?: string; 客户编号?: string; 客户名称?: string; 备注?: string }>();
  const [lines, setLines] = useState<SKLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [unsettled, setUnsettled] = useState<UnsettledShipmentRow[]>([]);
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);

  useEffect(() => { if (!open) return; form.resetFields(); setLines([]); }, [open, form]);

  const setLine = (i: number, patch: Partial<SKLine>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const openPicker = async () => {
    const 客户编号 = (form.getFieldValue("客户编号") as string | undefined)?.trim();
    if (!客户编号) { message.warning("请先填写客户编号"); return; }
    try {
      const rows = await receivablesApi.unsettled(客户编号);
      if (rows.length === 0) { message.warning("无待核销出货单"); return; }
      setUnsettled(rows);
      setPicked(Object.fromEntries(rows.map(r => [String(r.出货单号), r.未核销余额])));
      setSelectedKeys([]);
      setPickerOpen(true);
    } catch { message.error("加载待核销出货单失败"); }
  };

  const confirmPicker = () => {
    const 客户编号 = (form.getFieldValue("客户编号") as string | undefined)?.trim();
    const 客户名称 = (form.getFieldValue("客户名称") as string | undefined)?.trim();
    const chosen = unsettled.filter(r => selectedKeys.includes(String(r.出货单号)));
    if (chosen.length === 0) { message.warning("请勾选要核销的出货单"); return; }
    const built: SKLine[] = chosen.map(r => {
      const 本次收款 = Number(picked[String(r.出货单号)] ?? r.未核销余额);
      return {
        出仓单号: r.出货单号, 客户编号, 客户名称,
        货款金额: r.应收金额, 收款金额: 本次收款, 应收金额: r.未核销余额 - 本次收款,
      };
    });
    const apply = () => { setLines(built); setPickerOpen(false); };
    if (lines.length > 0) {
      Modal.confirm({ title: "替换现有明细?", content: "带出的待核销出货单将替换当前明细行。", onOk: apply });
    } else { apply(); }
  };

  const submit = async () => {
    let v: { 出仓单号?: string; 客户编号?: string; 客户名称?: string; 备注?: string };
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => Number(l.收款金额) > 0);
    if (ok.length === 0) { message.error("请至少录入一行收款金额>0的明细"); return; }
    setSaving(true);
    try {
      await salesReceiptApi.create({ 出仓单号: v.出仓单号, 备注: v.备注, 明细: ok });
      message.success("销售收款单已创建"); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建收款单失败");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "出仓单号", dataIndex: "出仓单号", width: 140, render: (v?: string) => v ?? "-" },
    { title: "客户编号", dataIndex: "客户编号", width: 160, render: (_: unknown, r: SKLine, i: number) =>
      <Input style={{ width: 144 }} value={r.客户编号 ?? ""} onChange={e => setLine(i, { 客户编号: e.target.value })} /> },
    { title: "客户名称", dataIndex: "客户名称", width: 200, render: (_: unknown, r: SKLine, i: number) =>
      <Input style={{ width: 184 }} value={r.客户名称 ?? ""} onChange={e => setLine(i, { 客户名称: e.target.value })} /> },
    { title: "货款金额", dataIndex: "货款金额", width: 110, render: (v?: number) => (v == null ? "-" : v) },
    { title: "收款金额", dataIndex: "收款金额", width: 140, render: (_: unknown, r: SKLine, i: number) =>
      <InputNumber min={0} style={{ width: 124 }} value={r.收款金额 ?? 0} onChange={n => setLine(i, { 收款金额: Number(n ?? 0) })} /> },
    { title: "应收金额", dataIndex: "应收金额", width: 110, render: (v?: number) => (v == null ? "-" : v) },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: SKLine, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];

  return (
    <Drawer title="新建销售收款单" width={820} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}><Form.Item name="客户编号" label="客户编号"><Input placeholder="带出待核销出货单需填写" /></Form.Item></Col>
          <Col span={8}><Form.Item name="客户名称" label="客户名称"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="出仓单号" label="出仓单号"><Input placeholder="可选,关联销售出货单" /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={24}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>
      <Space style={{ marginBottom: 12 }}>
        <Button onClick={openPicker}>带出待核销出货单</Button>
      </Space>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={columns} scroll={{ x: true }} />
      <Space style={{ marginTop: 12 }} size={24}>
        <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 收款金额: 0 }])}>加一行</Button>
        {showAmount && <Statistic title="收款金额合计" value={sumReceipt(lines)} />}
      </Space>

      <Modal title="待核销出货单" width={760} open={pickerOpen}
        onCancel={() => setPickerOpen(false)} onOk={confirmPicker} okText="带出">
        <Table size="small" rowKey={r => String(r.出货单号)} pagination={false} dataSource={unsettled}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
          columns={[
            { title: "出货单号", dataIndex: "出货单号", render: (v: string) => <span className="erp-num">{v}</span> },
            { title: "出货日期", dataIndex: "出货日期", render: (v?: string) => v?.slice(0, 10) },
            { title: "应收金额", dataIndex: "应收金额" },
            { title: "已收金额", dataIndex: "已收金额" },
            { title: "未核销余额", dataIndex: "未核销余额" },
            { title: "本次收款", key: "_pay", width: 140, render: (_: unknown, r: UnsettledShipmentRow) =>
              <InputNumber min={0} max={r.未核销余额} style={{ width: 120 }}
                value={picked[String(r.出货单号)] ?? r.未核销余额}
                onChange={n => setPicked(prev => ({ ...prev, [String(r.出货单号)]: Number(n ?? 0) }))} /> },
          ]} />
      </Modal>
    </Drawer>
  );
}

function DetailDrawer({ 单号, showAmount, onClose }: { 单号: string | null; showAmount: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<SKDetail | null>(null);
  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => { try { setDetail(await salesReceiptApi.get(单号)); } catch { message.error("加载收款详情失败"); } })();
  }, [单号]);
  const h = detail?.单头;
  return (
    <Drawer title={`销售收款单 ${单号 ?? ""}`} width={820} open={!!单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "单号", children: h?.单号 ?? "-" },
              { key: "src", label: "出仓单号", children: h?.出仓单号 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              ...(showAmount ? [{ key: "amt", label: "金额", children: h?.金额 == null ? "***" : String(h?.金额) }] : []),
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细}
            columns={[
              { title: "客户编号", dataIndex: "客户编号" }, { title: "客户名称", dataIndex: "客户名称" },
              ...(showAmount ? [
                { title: "货款金额", dataIndex: "货款金额", render: (v?: number | null) => (v == null ? "***" : v) },
                { title: "收款金额", dataIndex: "收款金额", render: (v?: number | null) => (v == null ? "***" : v) },
                { title: "应收金额", dataIndex: "应收金额", render: (v?: number | null) => (v == null ? "***" : v) },
              ] : []),
              { title: "备注", dataIndex: "备注" },
            ]} />
        </>
      )}
    </Drawer>
  );
}
