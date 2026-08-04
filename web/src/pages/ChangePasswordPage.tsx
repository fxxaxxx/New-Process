import { Button, Card, Form, Input, message } from "antd";
import axios from "axios";
import { authApi } from "../api/auth";

interface FormValues {
  原密码: string;
  新密码: string;
  确认新密码: string;
}

export default function ChangePasswordPage() {
  const [form] = Form.useForm<FormValues>();

  const onFinish = async (v: FormValues) => {
    try {
      const r = await authApi.changePassword({ 原密码: v.原密码, 新密码: v.新密码 });
      message.success(r.消息 ?? "密码修改成功");
      form.resetFields();
    } catch (e) {
      const msg = axios.isAxiosError(e)
        ? (e.response?.data as { 消息?: string } | undefined)?.消息
        : undefined;
      message.error(msg ?? "密码修改失败");
    }
  };

  return (
    <Card title="用户修改密码" style={{ maxWidth: 480 }}>
      <Form form={form} onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
        <Form.Item name="原密码" label="原密码" rules={[{ required: true, message: "请输入原密码" }]}>
          <Input.Password placeholder="请输入原密码" autoFocus />
        </Form.Item>
        <Form.Item
          name="新密码" label="新密码"
          rules={[
            { required: true, message: "请输入新密码" },
            { min: 6, message: "新密码长度至少 6 位" },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || v !== getFieldValue("原密码")
                  ? Promise.resolve()
                  : Promise.reject(new Error("新密码不能与原密码相同")),
            }),
          ]}
        >
          <Input.Password placeholder="至少 6 位" />
        </Form.Item>
        <Form.Item
          name="确认新密码" label="确认新密码" dependencies={["新密码"]}
          rules={[
            { required: true, message: "请再次输入新密码" },
            ({ getFieldValue }) => ({
              validator: (_, v) =>
                !v || v === getFieldValue("新密码")
                  ? Promise.resolve()
                  : Promise.reject(new Error("两次输入的新密码不一致")),
            }),
          ]}
        >
          <Input.Password placeholder="请再次输入新密码" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block style={{ fontWeight: 700 }}>
          保存
        </Button>
      </Form>
    </Card>
  );
}
