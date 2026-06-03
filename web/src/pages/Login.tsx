import { Button, Card, Form, Input, message } from "antd";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { useTheme } from "../theme/ThemeContext";

export default function Login() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const onFinish = async (v: { 用户: string; 密码: string }) => {
    const r = await login(v.用户, v.密码);
    if (r.成功) nav("/");
    else message.error(r.消息 ?? "登录失败");
  };
  return (
    <div style={{
      display: "grid", placeItems: "center", height: "100vh",
      background: theme.loginBg,
    }}>
      <Card style={{ width: 380, boxShadow: "0 8px 32px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 1 }}>兴信B ERP</div>
          <div style={{ color: "rgba(0,0,0,0.45)", fontSize: 13, marginTop: 4 }}>
            服装 / 塑胶一体化生产管理系统
          </div>
        </div>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="用户" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input autoFocus size="large" placeholder="admin" />
          </Form.Item>
          <Form.Item name="密码" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password size="large" placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large">登 录</Button>
        </Form>
      </Card>
    </div>
  );
}
