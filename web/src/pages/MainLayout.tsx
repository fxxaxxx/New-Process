import { Layout, Menu, Button, Tag } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";
import { MASTER_CONFIGS } from "./master/configs";

const { Sider, Header, Content } = Layout;

export default function MainLayout() {
  const perms = usePerms();
  const nav = useNavigate();
  const loc = useLocation();

  const children = Object.values(MASTER_CONFIGS)
    .filter((c) => can(perms, c.menu, "打开"))
    .map((c) => ({ key: `/master/${encodeURIComponent(c.menu)}`, label: c.title }));
  const items = [{ key: "base", label: "基础资料", children }];

  const logout = () => {
    localStorage.removeItem("erp_token");
    nav("/login");
  };

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={220} theme="dark" style={{ position: "sticky", top: 0, height: "100vh", overflow: "auto" }}>
        <div
          style={{
            height: 56, display: "flex", alignItems: "center", paddingLeft: 24,
            color: "#fff", fontSize: 17, fontWeight: 600, letterSpacing: 1,
            background: "rgba(255,255,255,0.04)",
          }}
        >
          兴信B ERP
        </div>
        <Menu
          theme="dark"
          mode="inline"
          openKeys={["base"]}
          selectedKeys={[loc.pathname]}
          items={items}
          onClick={(e) => nav(e.key)}
          style={{ borderInlineEnd: 0 }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: "#fff", padding: "0 24px", height: 56, lineHeight: "56px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,0.08)", position: "sticky", top: 0, zIndex: 9,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(0,0,0,0.85)" }}>
            服装 / 塑胶一体化 ERP — 基础资料
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Tag color="blue">管理员</Tag>
            <span style={{ color: "rgba(0,0,0,0.65)" }}>admin</span>
            <Button size="small" onClick={logout}>退出登录</Button>
          </span>
        </Header>

        <Content style={{ margin: 16 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
