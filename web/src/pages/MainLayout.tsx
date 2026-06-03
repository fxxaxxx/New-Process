import { useState } from "react";
import { Layout, Menu, Button, Segmented } from "antd";
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
  const [openKeys, setOpenKeys] = useState<string[]>(["base"]);

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
        width={224}
        theme={theme.menuTheme}
        style={{ background: theme.siderBg, position: "sticky", top: 0, height: "100vh", overflow: "auto" }}
      >
        <div style={{ padding: "20px 24px 16px" }}>
          <div style={{ fontFamily: theme.brandFont, color: theme.brand, fontSize: 26, fontWeight: 700, lineHeight: 1.05 }}>
            兴信<span style={{ fontSize: 18 }}>B</span>
          </div>
          <div style={{ color: theme.taglineColor, fontSize: 11, letterSpacing: ".18em", marginTop: 6, textTransform: "uppercase" }}>
            {theme.tagline}
          </div>
          <div style={{ height: 2, width: 34, marginTop: 14, background: theme.brand, opacity: .8 }} />
        </div>
        <Menu
          theme={theme.menuTheme}
          mode="inline"
          openKeys={openKeys}
          onOpenChange={(k) => setOpenKeys(k as string[])}
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
            borderBottom: theme.headerBorder, position: "sticky", top: 0, zIndex: 9,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 600, color: theme.headerColor, letterSpacing: ".02em" }}>
            基础资料
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Segmented
              size="small"
              value={themeKey}
              onChange={(v) => setThemeKey(v as string)}
              options={Object.values(THEMES).map((t) => ({ label: t.name, value: t.key }))}
            />
            <span style={{ color: theme.headerColor, opacity: 0.7, fontSize: 13 }}>管理员 · admin</span>
            <Button size="small" onClick={logout}>退出</Button>
          </span>
        </Header>

        <Content style={{ margin: 20 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
