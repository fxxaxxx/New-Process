import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, InputNumber, Row, Select, Space, Statistic, Table, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { productionApi, type ProductionHeader } from "../../api/production";
import { masterApi } from "../../api/master";
import { outsourcingApi, type OutLineDto } from "../../api/outsourcing";

interface Factory { 加工厂编号?: string; 加工厂名称?: string }
interface Item { 加工项目?: string }
interface Picked { 款号?: string; 款式?: string }

export default function OutsourceCreateDrawer({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [form] = Form.useForm<{ 生产单号?: string; 加工厂编号: string; 仓库?: string; 床号?: string; 备注?: string }>();
  const [orders, setOrders] = useState<ProductionHeader[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [picked, setPicked] = useState<Picked>({});
  const [lines, setLines] = useState<OutLineDto[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setOrders((await productionApi.list(1, 200)).items);
        setFactories((await masterApi("factories").list(1, 500)).items as Factory[]);
        setItems((await masterApi("outsource-items").list(1, 500)).items as Item[]);
      } catch { message.error("加载生产制单/加工厂/加工项目失败"); }
    })();
    form.resetFields(); setPicked({}); setLines([]);
  }, [open, form]);

  const onOrderChange = async (生产单号: string) => {
    try {
      const d = await productionApi.get(生产单号);
      setPicked({ 款号: d.单头?.款号, 款式: d.单头?.款式 });
    } catch { message.error("加载生产制单详情失败"); }
  };

  const setLine = (i: number, patch: Partial<OutLineDto>) =>
    setLines(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const submit = async () => {
    let v: { 生产单号?: string; 加工厂编号: string; 仓库?: string; 床号?: string; 备注?: string };
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => !!l.加工项目 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有加工项目和数量的明细"); return; }
    const 加工厂名称 = factories.find(f => String(f.加工厂编号) === v.加工厂编号)?.加工厂名称;
    setSaving(true);
    try {
      await outsourcingApi.create({ ...v, 加工厂名称, ...picked, 明细: ok });
      message.success("发外派工单已创建"); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建派工单失败");
    } finally { setSaving(false); }
  };

  const columns = [
    { title: "加工项目", dataIndex: "加工项目", width: 170, render: (_: unknown, r: OutLineDto, i: number) =>
      <Select style={{ width: 160 }} value={r.加工项目 || undefined} placeholder="加工项目"
        onChange={(val: string) => setLine(i, { 加工项目: val })}
        options={items.map(it => ({ value: String(it.加工项目), label: String(it.加工项目) }))} /> },
    { title: "颜色", dataIndex: "颜色", width: 100, render: (_: unknown, r: OutLineDto, i: number) =>
      <Input style={{ width: 90 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} /> },
    { title: "尺码", dataIndex: "尺码", width: 90, render: (_: unknown, r: OutLineDto, i: number) =>
      <Input style={{ width: 80 }} value={r.尺码 ?? ""} onChange={e => setLine(i, { 尺码: e.target.value })} /> },
    { title: "数量", dataIndex: "数量", width: 110, render: (_: unknown, r: OutLineDto, i: number) =>
      <InputNumber min={0} precision={0} style={{ width: 96 }} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: OutLineDto, i: number) =>
      <a onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];

  const 数量合计 = lines.reduce((a, l) => a + Number(l.数量 ?? 0), 0);

  return (
    <Drawer title="新建发外派工单" width={920} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="加工厂编号" label="加工厂" rules={[{ required: true, message: "请选择加工厂" }]}>
              <Select showSearch optionFilterProp="label"
                options={factories.map(f => ({ value: String(f.加工厂编号), label: `${f.加工厂编号} ${f.加工厂名称 ?? ""}` }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="生产单号" label="生产制单">
              <Select showSearch allowClear optionFilterProp="label" onChange={onOrderChange}
                options={orders.map(o => ({ value: String(o.生产单号), label: `${o.生产单号} ${o.款式 ?? ""}` }))} />
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item label="款号"><Input value={`${picked.款号 ?? ""} ${picked.款式 ?? ""}`} disabled /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}><Form.Item name="仓库" label="仓库"><Input /></Form.Item></Col>
          <Col span={6}><Form.Item name="床号" label="床号"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>
      <Table size="small" rowKey={(_, i) => String(i)} pagination={false} dataSource={lines} columns={columns} />
      <Space style={{ marginTop: 12 }} size={24}>
        <Button icon={<PlusOutlined />} onClick={() => setLines(prev => [...prev, { 加工项目: "", 数量: 0 }])}>加一行</Button>
        <Statistic title="发外数量合计" value={数量合计} />
      </Space>
    </Drawer>
  );
}
