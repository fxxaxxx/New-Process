import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { productionApi, type ProductionHeader } from "../../api/production";
import { cuttingsApi, type CuttingLine } from "../../api/cuttings";

interface Header { 款号?: string; 款式?: string; 客户编号?: string; 客户名称?: string; 加工厂编号?: string; 加工厂名称?: string }

export default function CuttingCreateDrawer({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form] = Form.useForm<{ 生产单号: string; 床号?: string; 布种?: string; 备注?: string }>();
  const [orders, setOrders] = useState<ProductionHeader[]>([]);
  const [picked, setPicked] = useState<Header>({});
  const [lines, setLines] = useState<CuttingLine[]>([]);
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
    try {
      const d = await productionApi.get(生产单号);
      const h = d.单头;
      setPicked({
        款号: h?.款号, 款式: h?.款式, 客户编号: h?.客户编号, 客户名称: h?.客户名称,
        加工厂编号: h?.加工厂编号, 加工厂名称: h?.加工厂名称,
      });
    } catch { message.error("加载生产制单详情失败"); }
  };

  const setLine = (i: number, patch: Partial<CuttingLine>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    let v: { 生产单号: string; 床号?: string; 布种?: string; 备注?: string };
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有数量的扎"); return; }
    setSaving(true);
    try {
      await cuttingsApi.create({ ...v, ...picked, 明细: ok });
      message.success("裁床单已创建"); onClose(); onCreated();
    } catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
      message.error(msg ?? "创建裁床单失败");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "扎号", dataIndex: "扎号", width: 90, render: (_: unknown, r: CuttingLine, i: number) =>
      <InputNumber min={0} precision={0} style={{ width: 76 }} value={r.扎号 ?? undefined} onChange={n => setLine(i, { 扎号: n == null ? undefined : Number(n) })} /> },
    { title: "缸号", dataIndex: "缸号", width: 100, render: (_: unknown, r: CuttingLine, i: number) =>
      <Input style={{ width: 90 }} value={r.缸号 ?? ""} onChange={e => setLine(i, { 缸号: e.target.value })} /> },
    { title: "颜色", dataIndex: "颜色", width: 100, render: (_: unknown, r: CuttingLine, i: number) =>
      <Input style={{ width: 90 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} /> },
    { title: "尺码", dataIndex: "尺码", width: 90, render: (_: unknown, r: CuttingLine, i: number) =>
      <Input style={{ width: 80 }} value={r.尺码 ?? ""} onChange={e => setLine(i, { 尺码: e.target.value })} /> },
    { title: "数量", dataIndex: "数量", width: 110, render: (_: unknown, r: CuttingLine, i: number) =>
      <InputNumber min={0} precision={0} style={{ width: 96 }} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: CuttingLine, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];

  const 数量合计 = lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

  return (
    <Drawer title="新建裁床单" width={900} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="生产单号" label="生产制单" rules={[{ required: true, message: "请选择生产制单" }]}>
              <Select showSearch optionFilterProp="label" onChange={onOrderChange}
                options={orders.map(o => ({ value: String(o.生产单号), label: `${o.生产单号} ${o.款式 ?? ""}` }))} />
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item label="款号"><Input value={picked.款号 ?? ""} disabled /></Form.Item></Col>
          <Col span={8}><Form.Item label="客户"><Input value={picked.客户名称 ?? ""} disabled /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}><Form.Item name="床号" label="床号"><Input /></Form.Item></Col>
          <Col span={6}><Form.Item name="布种" label="布种"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={columns} />
      <Space style={{ marginTop: 12 }} size={24}>
        <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 数量: 0 }])}>加一扎</Button>
        <Statistic title="裁床数量合计" value={数量合计} />
      </Space>
    </Drawer>
  );
}
