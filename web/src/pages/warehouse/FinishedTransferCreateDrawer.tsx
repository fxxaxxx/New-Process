import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { productionApi, type ProductionHeader } from "../../api/production";
import { finishedTransferApi, type FTLine } from "../../api/finished";

interface Picked { 款号?: string; 款式?: string }

export default function FinishedTransferCreateDrawer({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form] = Form.useForm<{ 源仓库: string; 目标仓库: string; 生产单号?: string; 备注?: string }>();
  const [orders, setOrders] = useState<ProductionHeader[]>([]);
  const [picked, setPicked] = useState<Picked>({});
  const [lines, setLines] = useState<FTLine[]>([]);
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
    try { const d = await productionApi.get(生产单号); setPicked({ 款号: d.单头?.款号, 款式: d.单头?.款式 }); }
    catch { message.error("加载生产制单详情失败"); }
  };
  const setLine = (i: number, patch: Partial<FTLine>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    let v: { 源仓库: string; 目标仓库: string; 生产单号?: string; 备注?: string };
    try { v = await form.validateFields(); } catch { return; }
    if (v.源仓库 === v.目标仓库) { message.error("源仓库与目标仓库不能相同"); return; }
    const ok = lines.filter(l => Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有数量的明细"); return; }
    setSaving(true);
    try {
      await finishedTransferApi.create({ ...v, ...picked, 明细: ok });
      message.success("成品调拨单已创建"); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建调拨单失败");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "颜色", dataIndex: "颜色", width: 110, render: (_: unknown, r: FTLine, i: number) =>
      <Input style={{ width: 96 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} /> },
    { title: "尺码", dataIndex: "尺码", width: 90, render: (_: unknown, r: FTLine, i: number) =>
      <Input style={{ width: 80 }} value={r.尺码 ?? ""} onChange={e => setLine(i, { 尺码: e.target.value })} /> },
    { title: "数量", dataIndex: "数量", width: 110, render: (_: unknown, r: FTLine, i: number) =>
      <InputNumber min={0} precision={0} style={{ width: 96 }} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: FTLine, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];
  const 数量合计 = lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

  return (
    <Drawer title="新建成品调拨单" width={900} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}><Form.Item name="源仓库" label="源仓库" rules={[{ required: true, message: "请填源仓库" }]}><Input placeholder="如 成品仓" /></Form.Item></Col>
          <Col span={8}><Form.Item name="目标仓库" label="目标仓库" rules={[{ required: true, message: "请填目标仓库" }]}><Input placeholder="如 半成品仓" /></Form.Item></Col>
          <Col span={8}>
            <Form.Item name="生产单号" label="生产制单">
              <Select showSearch allowClear optionFilterProp="label" onChange={onOrderChange}
                options={orders.map(o => ({ value: String(o.生产单号), label: `${o.生产单号} ${o.款式 ?? ""}` }))} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}><Form.Item label="款号"><Input value={`${picked.款号 ?? ""} ${picked.款式 ?? ""}`} disabled /></Form.Item></Col>
          <Col span={16}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={columns} />
      <Space style={{ marginTop: 12 }} size={24}>
        <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 数量: 0 }])}>加一行</Button>
        <Statistic title="调拨数量合计" value={数量合计} />
      </Space>
    </Drawer>
  );
}
