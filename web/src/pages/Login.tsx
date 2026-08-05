import { Button, Card, Form, Input, message } from "antd";
import { UserOutlined, LockOutlined, AppstoreOutlined, RocketOutlined, ShoppingCartOutlined, InboxOutlined } from "@ant-design/icons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/client";
import { useTheme } from "../theme/ThemeContext";

// 左侧品牌区特性点(与 Dashboard 渐变卡同色系)
const FEATURES = [
  { icon: <AppstoreOutlined />, text: "物料档案一体:来料 / 塑胶件 / 原料 / 工模" },
  { icon: <RocketOutlined />, text: "生产:BOM → 生产通知单 → 采购物料分析" },
  { icon: <ShoppingCartOutlined />, text: "采购:订单 → 入仓 → 退仓全流程" },
  { icon: <InboxOutlined />, text: "仓库:领料 → 盘点 → 实时库存报表" },
];

export default function Login() {
  const nav = useNavigate();
  const { theme } = useTheme();
  const primary = theme.antd.token?.colorPrimary as string;
  const [loading, setLoading] = useState(false);

  const onFinish = async (v: { 用户: string; 密码: string }) => {
    setLoading(true);
    try {
      const r = await login(v.用户, v.密码);
      if (r.成功) nav("/");
      else message.error(r.消息 ?? "登录失败");
    } catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } })?.response?.data?.消息;
      message.error(msg ?? "登录失败，请检查网络或稍后再试");
    }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: theme.loginBg, padding: 16 }}>
      <div style={{
        display: "flex", flexWrap: "wrap", width: "100%", maxWidth: 880, borderRadius: 22, overflow: "hidden",
        boxShadow: "0 34px 80px -30px rgba(15,23,42,0.5)",
      }}>
        {/* 左:品牌区(渐变底,与统计卡同风格) */}
        <div style={{
          flex: "1 1 340px", minWidth: 300, padding: "44px 40px", color: "#fff",
          background: `linear-gradient(150deg, ${primary} 0%, #818cf8 55%, #38bdf8 100%)`,
          display: "flex", flexDirection: "column", justifyContent: "center", gap: 26,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 15, display: "grid", placeItems: "center",
              background: "rgba(255,255,255,0.18)", fontWeight: 800, fontSize: 26,
            }}>兴</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: ".02em" }}>兴信B ERP</div>
              <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>服装 · 塑胶生产管理</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {FEATURES.map(f => (
              <div key={f.text} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5, opacity: 0.95 }}>
                <span style={{
                  width: 28, height: 28, borderRadius: 9, display: "inline-flex", flex: "0 0 28px",
                  alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.16)", fontSize: 14,
                }}>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>

        {/* 右:登录卡 */}
        <Card
          style={{ flex: "1 1 340px", minWidth: 300, background: theme.loginCardBg, border: "none", borderRadius: 0 }}
          styles={{ body: { padding: "44px 40px 36px" } }}
        >
          <div style={{ color: theme.brandText, fontSize: 20, fontWeight: 800, marginBottom: 6 }}>登录</div>
          <div style={{ fontSize: 12.5, opacity: 0.6, marginBottom: 26 }}>使用系统账号登录工作台</div>
          <Form onFinish={onFinish} layout="vertical" requiredMark={false} size="large">
            <Form.Item name="用户" label="用户名" rules={[{ required: true, message: "请输入用户名" }]}>
              <Input autoFocus prefix={<UserOutlined style={{ opacity: 0.45 }} />} placeholder="admin" />
            </Form.Item>
            <Form.Item name="密码" label="密码" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password prefix={<LockOutlined style={{ opacity: 0.45 }} />} placeholder="请输入密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}
              style={{ marginTop: 8, fontWeight: 700, height: 46, fontSize: 16 }}>
              登 录
            </Button>
          </Form>
        </Card>
      </div>
    </div>
  );
}
