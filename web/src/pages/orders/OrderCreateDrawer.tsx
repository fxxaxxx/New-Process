import { useEffect, useState } from "react";
import { Button, Col, DatePicker, Drawer, Form, Input, InputNumber, Row, Select, Space, Statistic, message } from "antd";
import type { Dayjs } from "dayjs";
import { masterApi } from "../../api/master";
import { ordersApi } from "../../api/orders";
import { stylesApi } from "../../api/styles";
import { matrixToLines, sumMatrix, type QtyMap } from "../../utils/matrix";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import QtyMatrix from "../../components/QtyMatrix";

const MENU = "成品客户订货单";

interface FormValues {
  客户编号: string; 款号: string; 款式?: string; 单价?: number; 仓库?: string;
  交货日期?: Dayjs; 合同号?: string; 客户款号?: string; 备注?: string;
}

export default function OrderCreateDrawer({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);
  const [form] = Form.useForm<FormValues>();
  const [customers, setCustomers] = useState<Record<string, unknown>[]>([]);
  const [styles, setStyles] = useState<Record<string, unknown>[]>([]);
  const [颜色s, set颜色s] = useState<string[]>([]);
  const [尺码s, set尺码s] = useState<string[]>([]);
  const [qty, setQty] = useState<QtyMap>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const [cs, ss] = await Promise.all([
          masterApi("customers").list(1, 200),
          masterApi("styles").list(1, 200),
        ]);
        setCustomers(cs.items as Record<string, unknown>[]);
        setStyles(ss.items as Record<string, unknown>[]);
        if (cs.total > 200 || ss.total > 200)
          message.warning("下拉数据超过200条，仅显示前200条");
      } catch { message.error("加载客户/款号数据失败"); }
    })();
    form.resetFields(); set颜色s([]); set尺码s([]); setQty({});
  }, [open, form]);

  // 选款号 → 带出颜色/尺码集生成矩阵
  const onStyleChange = async (款号: string) => {
    const st = styles.find(s => s.款号 === 款号);
    form.setFieldsValue({ 款式: st?.款式 as string | undefined });
    try {
      const full = await stylesApi.full(款号);
      set颜色s(full.颜色.map(c => c.颜色名称 ?? "").filter(Boolean));
      set尺码s(full.尺码);
      setQty({});
      if (full.颜色.length === 0 || full.尺码.length === 0)
        message.warning("该款号还没维护颜色/尺码，请先到款式详情页维护。");
    } catch { message.error("加载款式颜色/尺码失败"); }
  };

  const submit = async () => {
    let v: FormValues;
    try { v = await form.validateFields(); }
    catch { return; }   // 表单校验失败,antd 已高亮,不需要 toast
    const lines = matrixToLines(颜色s, 尺码s, qty);
    if (lines.length === 0) { message.error("请至少录入一格数量"); return; }
    const customer = customers.find(c => c.客户编号 === v.客户编号);
    setSaving(true);
    try {
      await ordersApi.create({
        客户编号: v.客户编号, 客户名称: String(customer?.客户名称 ?? ""),
        款号: v.款号, 款式: v.款式, 单价: v.单价, 仓库: v.仓库, 备注: v.备注,
        合同号: v.合同号, 客户款号: v.客户款号,
        交货日期: v.交货日期 ? v.交货日期.format("YYYY-MM-DD") : undefined,
        明细: lines,
      });
      message.success("订单已创建");
      onClose(); onCreated();
    } catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
      message.error(msg ?? "创建订单失败");
    } finally { setSaving(false); }
  };

  const 数量合计 = sumMatrix(qty);

  return (
    <Drawer title="新建客户订单" width={860} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存订单</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="客户编号" label="客户" rules={[{ required: true, message: "请选择客户" }]}>
              <Select showSearch optionFilterProp="label"
                options={customers.map(c => ({
                  value: String(c.客户编号), label: `${c.客户编号} ${c.客户名称 ?? ""}`,
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
          {!priceHidden && (
            <Col span={6}><Form.Item name="单价" label="单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
          )}
          <Col span={6}><Form.Item name="仓库" label="仓库"><Input placeholder="成品仓" /></Form.Item></Col>
          <Col span={6}><Form.Item name="交货日期" label="交货日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={6}><Form.Item name="合同号" label="合同号"><Input /></Form.Item></Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}><Form.Item name="客户款号" label="客户款号"><Input /></Form.Item></Col>
          <Col span={12}><Form.Item name="备注" label="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>

      {颜色s.length > 0 && 尺码s.length > 0 && (
        <>
          <QtyMatrix 颜色s={颜色s} 尺码s={尺码s} value={qty} onChange={setQty} />
          <Space style={{ marginTop: 16 }} size={32}>
            <Statistic title="数量合计" value={数量合计} />
          </Space>
        </>
      )}
    </Drawer>
  );
}
