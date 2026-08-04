import { useEffect, useState } from "react";
import { Button, Card, Form, Input, message } from "antd";
import { companyProfileApi, type SettingItem } from "../../api/systemSettings";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "基本资料";

// 基本资料(公司资料):一组存于系统配置表的键值,后端固定键白名单
export default function CompanyProfilePage() {
  const perms = usePerms();
  const [items, setItems] = useState<SettingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const editable = can(perms, MENU, "保存");

  useEffect(() => {
    setLoading(true);
    companyProfileApi.get()
      .then((rows) => {
        setItems(rows);
        form.setFieldsValue(Object.fromEntries(rows.map((r) => [r.键, r.值 ?? ""])));
      })
      .catch(() => message.error("加载公司资料失败"))
      .finally(() => setLoading(false));
  }, [form]);

  const save = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      await companyProfileApi.save(v);
      message.success("已保存");
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    } finally { setSaving(false); }
  };

  return (
    <Card title="基本资料(公司资料)" variant="borderless" loading={loading}
      extra={editable && <Button type="primary" loading={saving} onClick={save}>保存</Button>}>
      <Form form={form} layout="vertical" style={{ maxWidth: 640 }}>
        {items.map((it) => (
          <Form.Item key={it.键} name={it.键} label={it.标签}>
            <Input disabled={!editable} placeholder={`请输入${it.标签}`} />
          </Form.Item>
        ))}
      </Form>
    </Card>
  );
}
