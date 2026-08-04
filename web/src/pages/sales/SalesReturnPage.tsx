import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Col, Descriptions, Drawer, Form, Input, InputNumber, Popconfirm,
  Row, Space, Statistic, Table, Tag, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { salesReturnApi, type SRDetail, type SRHeader, type SRLine } from "../../api/sales";
import { sumAmount, sumQty } from "../../utils/salesLines";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "销售退货";

export default function SalesReturnPage() {
  const perms = usePerms();
  const showPrice = can(perms, MENU, "单价");
  const [rows, setRows] = useState<SRHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await salesReturnApi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { message.error("加载销售退货单失败"); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const columns = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "销售单号", dataIndex: "销售单号", key: "销售单号", render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "客户", dataIndex: "客户名称", key: "客户名称" },
    { title: "仓库", dataIndex: "仓库", key: "仓库" },
    { title: "退货数量", dataIndex: "数量", key: "数量" },
    ...(showPrice ? [{ title: "金额", dataIndex: "金额", key: "金额", render: (v?: number | null) => (v == null ? "***" : v) }] : []),
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: SRHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => salesReturnApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => salesReturnApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该退货单?" onConfirm={() => act(() => salesReturnApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="销售退货" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索单号/客户/仓库" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          {can(perms, MENU, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建退货单</Button>}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <CreateDrawer open={creating} showPrice={showPrice} onClose={() => setCreating(false)} onCreated={load} />
      <DetailDrawer 单号={viewing} showPrice={showPrice} onClose={() => setViewing(null)} />
    </Card>
  );
}

function CreateDrawer({ open, showPrice, onClose, onCreated }: {
  open: boolean; showPrice: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form] = Form.useForm<{ 仓库: string; 销售单号?: string; 客户编号?: string; 客户名称?: string; 备注?: string }>();
  const [销售单号, set销售单号] = useState("");
  const [lines, setLines] = useState<SRLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!open) return; form.resetFields(); set销售单号(""); setLines([]); }, [open, form]);

  const loadBasis = async () => {
    if (!销售单号) { message.error("请先填销售单号"); return; }
    try {
      const b = await salesReturnApi.basis(销售单号);
      setLines(b.map(x => ({
        物料编号: x.物料编号, 物料名称: x.物料名称, 规格: x.规格, 颜色: x.颜色, 单位: x.单位,
        数量: Number(x.数量 ?? 0), 单价: x.单价 == null ? undefined : Number(x.单价),
      })));
      form.setFieldValue("销售单号", 销售单号);
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "带出销售单明细失败");
    }
  };
  const setLine = (i: number, patch: Partial<SRLine>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    let v: { 仓库: string; 销售单号?: string; 客户编号?: string; 客户名称?: string; 备注?: string };
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => !!l.物料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有物料和数量的明细"); return; }
    setSaving(true);
    try {
      await salesReturnApi.create({ ...v, 销售单号: 销售单号 || undefined, 明细: ok });
      message.success("销售退货单已创建"); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建退货单失败");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 130, render: (_: unknown, r: SRLine, i: number) =>
      <Input style={{ width: 116 }} value={r.物料编号 ?? ""} onChange={e => setLine(i, { 物料编号: e.target.value })} /> },
    { title: "物料名称", dataIndex: "物料名称", width: 130, render: (_: unknown, r: SRLine, i: number) =>
      <Input style={{ width: 116 }} value={r.物料名称 ?? ""} onChange={e => setLine(i, { 物料名称: e.target.value })} /> },
    { title: "规格", dataIndex: "规格", width: 100, render: (_: unknown, r: SRLine, i: number) =>
      <Input style={{ width: 88 }} value={r.规格 ?? ""} onChange={e => setLine(i, { 规格: e.target.value })} /> },
    { title: "颜色", dataIndex: "颜色", width: 90, render: (_: unknown, r: SRLine, i: number) =>
      <Input style={{ width: 80 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} /> },
    { title: "单位", dataIndex: "单位", width: 80, render: (_: unknown, r: SRLine, i: number) =>
      <Input style={{ width: 68 }} value={r.单位 ?? ""} onChange={e => setLine(i, { 单位: e.target.value })} /> },
    { title: "数量", dataIndex: "数量", width: 100, render: (_: unknown, r: SRLine, i: number) =>
      <InputNumber min={0} precision={0} style={{ width: 88 }} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    ...(showPrice ? [{ title: "单价", dataIndex: "单价", width: 110, render: (_: unknown, r: SRLine, i: number) =>
      <InputNumber min={0} style={{ width: 96 }} value={r.单价 ?? 0} onChange={n => setLine(i, { 单价: Number(n ?? 0) })} /> }] : []),
    ...(showPrice ? [{ title: "金额", key: "金额", width: 100, render: (_: unknown, r: SRLine) => Number(r.数量 ?? 0) * Number(r.单价 ?? 0) }] : []),
    { title: "", key: "_op", width: 50, render: (_: unknown, __: SRLine, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];

  return (
    <Drawer title="新建销售退货单" width={1040} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}><Form.Item name="仓库" label="仓库" rules={[{ required: true, message: "请填仓库" }]}><Input placeholder="如 成品仓" /></Form.Item></Col>
          <Col span={8}>
            <Form.Item name="销售单号" label="销售单号">
              <Space.Compact style={{ width: "100%" }}>
                <Input placeholder="原销售出货单号" value={销售单号} onChange={e => set销售单号(e.target.value)} />
                <Button onClick={loadBasis}>带出</Button>
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item name="客户编号" label="客户编号"><Input /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="客户名称" label="客户名称"><Input /></Form.Item></Col>
          <Col span={16}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={columns} />
      <Space style={{ marginTop: 12 }} size={24}>
        <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 数量: 0 }])}>加一行</Button>
        <Statistic title="退货数量合计" value={sumQty(lines)} />
        {showPrice && <Statistic title="金额合计" value={sumAmount(lines)} />}
      </Space>
    </Drawer>
  );
}

function DetailDrawer({ 单号, showPrice, onClose }: { 单号: string | null; showPrice: boolean; onClose: () => void }) {
  const [detail, setDetail] = useState<SRDetail | null>(null);
  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => { try { setDetail(await salesReturnApi.get(单号)); } catch { message.error("加载退货详情失败"); } })();
  }, [单号]);
  const h = detail?.单头;
  return (
    <Drawer title={`销售退货单 ${单号 ?? ""}`} width={900} open={!!单号} onClose={onClose}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "单号", children: h?.单号 ?? "-" },
              { key: "src", label: "销售单号", children: h?.销售单号 ?? "-" },
              { key: "cust", label: "客户", children: h?.客户名称 ?? "-" },
              { key: "wh", label: "仓库", children: h?.仓库 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              { key: "qty", label: "退货数量", children: String(h?.数量 ?? "-") },
              ...(showPrice ? [{ key: "amt", label: "金额", children: h?.金额 == null ? "***" : String(h?.金额) }] : []),
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细}
            scroll={{ x: "max-content", y: 380 }}
            columns={[
              { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
              { title: "规格", dataIndex: "规格" }, { title: "颜色", dataIndex: "颜色" },
              { title: "单位", dataIndex: "单位" }, { title: "数量", dataIndex: "数量" },
              ...(showPrice ? [
                { title: "单价", dataIndex: "单价", render: (v?: number | null) => (v == null ? "***" : v) },
                { title: "金额", dataIndex: "金额", render: (v?: number | null) => (v == null ? "***" : v) },
              ] : []),
            ]} />
        </>
      )}
    </Drawer>
  );
}
