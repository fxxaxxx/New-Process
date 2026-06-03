import { Layout, Menu, Button, Tag, Segmented } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";
import { useTheme } from "../theme/ThemeContext";
import { THEMES } from "../theme/themes";
import { MASTER_CONFIGS } from "./master/configs";

const { Sider, Header, Content } = Layout;

export default function MainLayout() {
  const perms = usePerms();
  const nav = useNavigate();
  const loc = useLocation();
  const { theme, themeKey, setThemeKey } = useTheme();

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
      <Sider
        width={220}
        theme={theme.siderTheme}
        style={{ background: theme.siderBg, position: "sticky", top: 0, height: "100vh", overflow: "auto" }}
      >
        <div
          style={{
            height: 56, display: "flex", alignItems: "center", paddingLeft: 24,
            fontSize: 17, fontWeight: 700, letterSpacing: 1,
            color: theme.brandColor, background: theme.brandBg,
          }}
        >
          兴信B ERP
        </div>
        <Menu
          theme={theme.siderTheme}
          mode="inline"
          openKeys={["base"]}
          selectedKeys={[loc.pathname]}
          items={items}
          onClick={(e) => nav(e.key)}
          style={{ borderInlineEnd: 0, background: "transparent" }}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: theme.headerBg, padding: "0 24px", height: 56, lineHeight: "56px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            boxShadow: "0 1px 4px rgba(0,21,41,0.08)", position: "sticky", top: 0, zIndex: 9,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 500, color: theme.headerColor }}>
            服装 / 塑胶一体化 ERP — 基础资料
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Segmented
              size="small"
              value={themeKey}
              onChange={(v) => setThemeKey(v as string)}
              options={Object.values(THEMES).map((t) => ({ label: t.name, value: t.key }))}
            />
            <Tag color={theme.antd.token?.colorPrimary as string}>管理员</Tag>
            <span style={{ color: theme.headerColor, opacity: 0.75 }}>admin</span>
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
