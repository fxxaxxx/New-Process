import { useEffect, useState } from "react";
import { Button, Col, DatePicker, Drawer, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from "antd";
import type { Dayjs } from "dayjs";
import { masterApi } from "../../api/master";
import { ordersApi, type OrderHeader } from "../../api/orders";
import { productionApi } from "../../api/production";
import { stylesApi } from "../../api/styles";
import { linesToMatrix, matrixToLines, sumMatrix, type QtyMap } from "../../utils/matrix";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import QtyMatrix from "../../components/QtyMatrix";

const MENU = "生产制单";

interface FormValues {
  订单单号?: string; 款号: string; 款式?: string;
  客户编号?: string; 客户名称?: string; 加工厂编号?: string;
  合同号?: string; 跟单员?: string; 出货单价?: number; 交货日期?: Dayjs; 备注?: string;
}

export default function ProductionCreateDrawer({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);
  const [form] = Form.useForm<FormValues>();
  const [orders, setOrders] = useState<OrderHeader[]>([]);
  const [styles, setStyles] = useState<Record<string, unknown>[]>([]);
  const [factories, setFactories] = useState<Record<string, unknown>[]>([]);
  const [颜色s, set颜色s] = useState<string[]>([]);
  const [尺码s, set尺码s] = useState<string[]>([]);
  const [qty, setQty] = useState<QtyMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [os, ss, fs] = await Promise.all([
          ordersApi.list(1, 200),
          masterApi("styles").list(1, 200),
          masterApi("factories").list(1, 200),
        ]);
        setOrders(os.items);
        setStyles(ss.items as Record<string, unknown>[]);
        setFactories(fs.items as Record<string, unknown>[]);
        // 下拉一页 200 条上限提示
        if (os.total > 200 || ss.total > 200 || fs.total > 200)
          message.warning("下拉数据超过200条，仅显示前200条");
      } catch { message.error("加载订单/款号/加工厂数据失败"); }
    })();
    form.resetFields(); set颜色s([]); set尺码s([]); setQty({});
  }, [open, form]);

  // 选款号 → 带出颜色/尺码矩阵
  const loadStyleMatrix = async (款号: string) => {
    const full = await stylesApi.full(款号);
    set颜色s(full.颜色.map(c => c.颜色名称 ?? "").filter(Boolean));
    set尺码s(full.尺码);
    if (full.颜色.length === 0 || full.尺码.length === 0)
      message.warning("该款号还没维护颜色/尺码，请先到款式详情页维护。");
    return full;
  };

  const onStyleChange = async (款号: string) => {
    const st = styles.find(s => s.款号 === 款号);
    form.setFieldsValue({ 款式: st?.款式 as string | undefined });
    try {
      await loadStyleMatrix(款号);
      setQty({});
    } catch { message.error("加载款式颜色/尺码失败"); }
  };

  // 从订单生成：带出客户/款号/数量矩阵
  const onOrderChange = async (订单单号?: string) => {
    if (!订单单号) return;
    try {
      const detail = await ordersApi.get(订单单号);
      const 款号 = detail.总表?.款号 ?? "";
      form.setFieldsValue({
        款号, 款式: detail.总表?.款式,
        客户编号: detail.订货单?.客户编号, 客户名称: detail.订货单?.客户名称,
      });
      await loadStyleMatrix(款号);
      setQty(linesToMatrix(detail.明细));   // 订单的色码数量直接回填矩阵
    } catch { message.error("加载订单数据失败"); }
  };

  const submit = async () => {
    let v: FormValues;
    try { v = await form.validateFields(); }
    catch { return; }
    const lines = matrixToLines(颜色s, 尺码s, qty);
    if (lines.length === 0) { message.error("请至少录入一格数量"); return; }
    const factory = factories.find(f => f.加工厂编号 === v.加工厂编号);
    setSaving(true);
    try {
      await productionApi.create({
        款号: v.款号, 款式: v.款式, 订单单号: v.订单单号 || undefined,
        客户编号: v.客户编号 || undefined, 客户名称: v.客户名称 || undefined,
        加工厂编号: v.加工厂编号 || undefined,
        加工厂名称: factory ? String(factory.加工厂名称 ?? "") : undefined,
        合同号: v.合同号, 跟单员: v.跟单员, 出货单价: v.出货单价, 备注: v.备注,
        交货日期: v.交货日期 ? v.交货日期.format("YYYY-MM-DD") : undefined,
        数量明细: lines,
      });
      message.success("生产制单已创建（工序/物料已自动展开）");
      onClose(); onCreated();
    } catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
      message.error(msg ?? "创建生产制单失败");
    } finally { setSaving(false); }
  };

  return (
    <Drawer title="新建生产制单" width={900} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存制单</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="订单单号" label="从订单生成（可选）">
              <Select allowClear showSearch optionFilterProp="label" onChange={onOrderChange}
                options={orders.map(o => ({
                  value: String(o.单号), label: `${o.单号} ${o.客户名称 ?? ""}`,
                }))} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="款号" label="款号" rules={[{ required: true, message: "请选择款号" }]}>
              <Select showSearch optionFilterProp="label" onChange={onStyleChange}
                options={styles.map(s => ({
                  value: String(s.款号), label: `${s.款号} ${s.款式 ?? ""}`,
                }))} />
            </Form.Item>
          </Col>
          <Col span={8}><Form.Item name="款式" label="款式"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}><Form.Item name="客户编号" label="客户编号"><Input /></Form.Item></Col>
          <Col span={8}><Form.Item name="客户名称" label="客户名称"><Input /></Form.Item></Col>
          <Col span={8}>
            <Form.Item name="加工厂编号" label="加工厂">
              <Select allowClear showSearch optionFilterProp="label"
                options={factories.map(f => ({
                  value: String(f.加工厂编号), label: `${f.加工厂编号} ${f.加工厂名称 ?? ""}`,
                }))} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}><Form.Item name="合同号" label="合同号"><Input /></Form.Item></Col>
          <Col span={6}><Form.Item name="跟单员" label="跟单员"><Input /></Form.Item></Col>
          {!priceHidden && (
            <Col span={6}><Form.Item name="出货单价" label="出货单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
          )}
          <Col span={6}><Form.Item name="交货日期" label="交货日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
        </Row>
        <Form.Item name="备注" label="备注"><Input /></Form.Item>
      </Form>

      {颜色s.length > 0 && 尺码s.length > 0 && (
        <>
          <QtyMatrix 颜色s={颜色s} 尺码s={尺码s} value={qty} onChange={setQty} />
          <Space style={{ marginTop: 16 }} size={32}>
            <Statistic title="计划数量" value={sumMatrix(qty)} />
          </Space>
        </>
      )}
    </Drawer>
  );
}
