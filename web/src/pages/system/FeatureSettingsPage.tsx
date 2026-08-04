import { useEffect, useState } from "react";
import { Button, Card, Form, InputNumber, message, Select } from "antd";
import { featureSettingsApi } from "../../api/systemSettings";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "功能设置";
const 货币键 = "系统.默认货币";
const 单价小数位键 = "系统.单价小数位";
const 数量小数位键 = "系统.数量小数位";

// 功能设置:系统级参数(默认货币/单价小数位/数量小数位),存于系统配置表
export default function FeatureSettingsPage() {
  const perms = usePerms();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const editable = can(perms, MENU, "保存");

  useEffect(() => {
    setLoading(true);
    featureSettingsApi.get()
      .then((rows) => {
        form.setFieldsValue({
          [货币键]: rows.find((r) => r.键 === 货币键)?.值 ?? "HKD",
          [单价小数位键]: Number(rows.find((r) => r.键 === 单价小数位键)?.值 ?? 4),
          [数量小数位键]: Number(rows.find((r) => r.键 === 数量小数位键)?.值 ?? 2),
        });
      })
      .catch(() => message.error("加载功能设置失败"))
      .finally(() => setLoading(false));
  }, [form]);

  const save = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await featureSettingsApi.save({
        [货币键]: String(v[货币键]),
        [单价小数位键]: String(v[单价小数位键]),
        [数量小数位键]: String(v[数量小数位键]),
      });
      message.success("已保存");
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    } finally { setSaving(false); }
  };

  return (
    <Card title="功能设置" variant="borderless" loading={loading}
      extra={editable && <Button type="primary" loading={saving} onClick={save}>保存</Button>}>
      <Form form={form} layout="vertical" style={{ maxWidth: 480 }}>
        <Form.Item name={货币键} label="默认货币" rules={[{ required: true, message: "请选择默认货币" }]}>
          <Select disabled={!editable}
            options={["HKD", "RMB", "USD", "EUR"].map((c) => ({ value: c, label: c }))} />
        </Form.Item>
        <Form.Item name={单价小数位键} label="单价小数位" rules={[{ required: true, message: "请输入单价小数位" }]}>
          <InputNumber min={0} max={6} precision={0} disabled={!editable} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name={数量小数位键} label="数量小数位" rules={[{ required: true, message: "请输入数量小数位" }]}>
          <InputNumber min={0} max={6} precision={0} disabled={!editable} style={{ width: "100%" }} />
        </Form.Item>
      </Form>
    </Card>
  );
}
