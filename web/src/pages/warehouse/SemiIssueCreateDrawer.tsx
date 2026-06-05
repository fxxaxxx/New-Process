import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { productionApi, type ProductionHeader } from "../../api/production";
import { semiIssueApi, type SILine } from "../../api/semi";

interface Picked { 款号?: string }

export default function SemiIssueCreateDrawer({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form] = Form.useForm<{ 仓库: string; 生产单号?: string; 部门?: string; 领料人?: string; 备注?: string }>();
  const [orders, setOrders] = useState<ProductionHeader[]>([]);
  const [picked, setPicked] = useState<Picked>({});
  const [lines, setLines] = useState<SILine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try { setOrders((await productionApi.list(1, 200)).items); }
      catch { message.error("加载生产制单失败"); }
    })();
    form.resetFields(); setPicked({}); setLines([]);
  }, [open, form]);

  const onOrderChange = async (生产单号: string) => {
    try { const d = await productionApi.get(生产单号); setPicked({ 款号: d.单头?.款号 }); }
    catch { message.error("加载生产制单详情失败"); }
  };
  const setLine = (i: number, patch: Partial<SILine>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    let v: { 仓库: string; 生产单号?: string; 部门?: string; 领料人?: string; 备注?: string };
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => !!l.物料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有物料和数量的明细"); return; }
    setSaving(true);
    try {
      await semiIssueApi.create({ ...v, ...picked, 明细: ok });
      message.success("半成品领料单已创建"); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建领料单失败");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 130, render: (_: unknown, r: SILine, i: number) =>
      <Input style={{ width: 116 }} value={r.物料编号 ?? ""} onChange={e => setLine(i, { 物料编号: e.target.value })} /> },
    { title: "物料名称", dataIndex: "物料名称", width: 130, render: (_: unknown, r: SILine, i: number) =>
      <Input style={{ width: 116 }} value={r.物料名称 ?? ""} onChange={e => setLine(i, { 物料名称: e.target.value })} /> },
    { title: "规格", dataIndex: "规格", width: 100, render: (_: unknown, r: SILine, i: number) =>
      <Input style={{ width: 88 }} value={r.规格 ?? ""} onChange={e => setLine(i, { 规格: e.target.value })} /> },
    { title: "颜色", dataIndex: "颜色", width: 90, render: (_: unknown, r: SILine, i: number) =>
      <Input style={{ width: 80 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} /> },
    { title: "数量", dataIndex: "数量", width: 100, render: (_: unknown, r: SILine, i: number) =>
      <InputNumber min={0} precision={0} style={{ width: 88 }} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    { title: "单价", dataIndex: "单价", width: 110, render: (_: unknown, r: SILine, i: number) =>
      <InputNumber min={0} style={{ width: 96 }} value={r.单价 ?? 0} onChange={n => setLine(i, { 单价: Number(n ?? 0) })} /> },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: SILine, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];
  const 数量合计 = lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

  return (
    <Drawer title="新建半成品领料单" width={960} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={6}><Form.Item name="仓库" label="仓库" rules={[{ required: true, message: "请填仓库" }]}><Input placeholder="如 半成品仓" /></Form.Item></Col>
          <Col span={6}><Form.Item name="部门" label="领料部门"><Input /></Form.Item></Col>
          <Col span={6}><Form.Item name="领料人" label="领料人"><Input /></Form.Item></Col>
          <Col span={6}>
            <Form.Item name="生产单号" label="生产制单">
              <Select showSearch allowClear optionFilterProp="label" onChange={onOrderChange}
                options={orders.map(o => ({ value: String(o.生产单号), label: `${o.生产单号} ${o.款式 ?? ""}` }))} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}><Form.Item label="款号"><Input value={picked.款号 ?? ""} disabled /></Form.Item></Col>
          <Col span={16}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={columns} />
      <Space style={{ marginTop: 12 }} size={24}>
        <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 数量: 0 }])}>加一行</Button>
        <Statistic title="领料数量合计" value={数量合计} />
      </Space>
    </Drawer>
  );
}
