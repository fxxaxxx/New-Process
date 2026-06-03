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
    <div style={{ display: "grid", placeItems: "center", height: "100vh", background: theme.loginBg }}>
      <Card
        style={{ width: 400, background: theme.loginCardBg, border: "none", boxShadow: "0 24px 60px -20px rgba(0,0,0,0.45)" }}
        styles={{ body: { padding: "36px 36px 30px" } }}
      >
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontFamily: theme.brandFont, color: theme.brand, fontSize: 38, fontWeight: 700, lineHeight: 1 }}>
            兴信<span style={{ fontSize: 26 }}>B</span>
          </div>
          <div style={{ color: theme.taglineColor, fontSize: 11, letterSpacing: ".2em", marginTop: 8, textTransform: "uppercase" }}>
            {theme.tagline}
          </div>
          <div style={{ height: 2, width: 40, marginTop: 14, background: theme.brand, opacity: .85 }} />
        </div>
        <Form onFinish={onFinish} layout="vertical" requiredMark={false}>
          <Form.Item name="用户" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
            <Input autoFocus size="large" placeholder="admin" />
          </Form.Item>
          <Form.Item name="密码" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
            <Input.Password size="large" placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" style={{ marginTop: 4, fontWeight: 600, letterSpacing: ".1em" }}>
            登 录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
