import { useState, type ReactNode } from "react";
import { Layout, Menu, Button, Segmented, Avatar } from "antd";
import {
  TeamOutlined, ShopOutlined, ToolOutlined, AppstoreOutlined,
  ApartmentOutlined, IdcardOutlined, TagsOutlined, ProfileOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";
import { useTheme } from "../theme/ThemeContext";
import { THEMES } from "../theme/themes";
import { MASTER_CONFIGS } from "./master/configs";

const { Sider, Header, Content } = Layout;

function iconFor(menu: string): ReactNode {
  if (menu.includes("客户")) return <TeamOutlined />;
  if (menu.includes("供应商")) return <ShopOutlined />;
  if (menu.includes("加工厂")) return <ToolOutlined />;
  if (menu.includes("物料")) return <AppstoreOutlined />;
  if (menu.includes("部门")) return <ApartmentOutlined />;
  if (menu.includes("人事")) return <IdcardOutlined />;
  if (menu.includes("报价")) return <TagsOutlined />;
  return <ProfileOutlined />;
}

export default function MainLayout() {
  const perms = usePerms();
  const nav = useNavigate();
  const loc = useLocation();
  const { theme, themeKey, setThemeKey } = useTheme();
  const [openKeys, setOpenKeys] = useState<string[]>(["base"]);

  const children = Object.values(MASTER_CONFIGS)
    .filter((c) => can(perms, c.menu, "打开"))
    .map((c) => ({ key: `/master/${encodeURIComponent(c.menu)}`, label: c.title, icon: iconFor(c.menu) }));
  const items = [{ key: "base", label: "基础资料", icon: <DatabaseOutlined />, children }];

  const logout = () => {
    localStorage.removeItem("erp_token");
    nav("/login");
  };

  const primary = theme.antd.token?.colorPrimary as string;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={232}
        theme={theme.siderTheme}
        className="erp-sider"
        style={{
          background: theme.siderBg, position: "sticky", top: 0, height: "100vh", overflow: "auto",
          borderRight: theme.headerBorder,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "18px 20px 14px" }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, display: "grid", placeItems: "center",
            background: `linear-gradient(135deg, ${primary}, #38bdf8)`, color: "#fff", fontWeight: 800, fontSize: 18,
            boxShadow: `0 6px 16px -6px ${primary}`,
          }}>兴</div>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ color: theme.brandText, fontWeight: 800, fontSize: 16, letterSpacing: ".01em" }}>兴信B ERP</div>
            <div style={{ color: theme.brandSub, fontSize: 11, marginTop: 2 }}>服装 · 塑胶生产管理</div>
          </div>
        </div>
        <Menu
          theme={theme.siderTheme}
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
            background: theme.headerBg, padding: "0 24px", height: 60, lineHeight: "60px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: theme.headerBorder, position: "sticky", top: 0, zIndex: 9,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: theme.headerColor }}>基础资料</span>
          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Segmented
              size="small"
              value={themeKey}
              onChange={(v) => setThemeKey(v as string)}
              options={Object.values(THEMES).map((t) => ({ label: t.name, value: t.key }))}
            />
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar size={28} style={{ background: primary, fontSize: 13 }}>管</Avatar>
              <span style={{ color: theme.headerColor, opacity: 0.85, fontSize: 13, fontWeight: 600 }}>admin</span>
            </span>
            <Button size="small" onClick={logout}>退出</Button>
          </span>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
