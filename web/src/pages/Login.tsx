import { Button, Card, Form, Input, message } from "antd";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { useTheme } from "../theme/ThemeContext";

export default function Login() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const primary = theme.antd.token?.colorPrimary as string;

  const onFinish = async (v: { 用户: string; 密码: string }) => {
    const r = await login(v.用户, v.密码);
    if (r.成功) nav("/");
    else message.error(r.消息 ?? "登录失败");
  };

  return (
    <div style={{ display: "grid", placeItems: "center", height: "100vh", background: theme.loginBg }}>
      <Card
        style={{ width: 400, background: theme.loginCardBg, border: "none", borderRadius: 18, boxShadow: "0 30px 70px -28px rgba(15,23,42,0.45)" }}
        styles={{ body: { padding: "38px 38px 32px" } }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 26 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 14, display: "grid", placeItems: "center",
            background: `linear-gradient(135deg, ${primary}, #38bdf8)`, color: "#fff", fontWeight: 800, fontSize: 24,
            boxShadow: `0 10px 24px -8px ${primary}`,
          }}>兴</div>
          <div>
            <div style={{ color: theme.brandText, fontSize: 22, fontWeight: 800, letterSpacing: ".01em" }}>兴信B ERP</div>
            <div style={{ color: theme.brandSub, fontSize: 12, marginTop: 3 }}>服装 · 塑胶一体化生产管理</div>
          </div>
        </div>
        <Form onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
          <Form.Item name="用户" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input autoFocus placeholder="admin" />
          </Form.Item>
          <Form.Item name="密码" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" style={{ marginTop: 6, fontWeight: 700 }}>
            登 录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
