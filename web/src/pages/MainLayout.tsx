import { useState } from "react";
import { Layout, Menu, Button, Avatar } from "antd";
import { AppstoreOutlined } from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";
import { useTheme } from "../theme/ThemeContext";
import { MENU_TREE } from "../nav/menuTree";

const { Sider, Header, Content } = Layout;

function titleFor(pathname: string): string {
  if (pathname.startsWith("/_todo/")) return decodeURIComponent(pathname.slice("/_todo/".length));
  for (const g of MENU_TREE) for (const leaf of g.children)
    if (leaf.path && pathname.startsWith(leaf.path)) return leaf.label;
  return "兴信B ERP";
}

export default function MainLayout() {
  const perms = usePerms();
  const nav = useNavigate();
  const loc = useLocation();
  const { theme } = useTheme();
  const [openKeys, setOpenKeys] = useState<string[]>([]);   // 默认全折叠,点击菜单组才展开

  const items = MENU_TREE.map((g) => {
    const leaves = g.children
      .filter((leaf) => !leaf.perm || can(perms, leaf.perm, "打开"))
      .map((leaf) => {
        const key = leaf.path
          ? `${leaf.path}#${leaf.label}`
          : `/_todo/${encodeURIComponent(leaf.label)}`;
        return { key, label: leaf.label };
      });
    return leaves.length
      ? { key: g.key, label: g.label, icon: <AppstoreOutlined />, children: leaves }
      : null;
  }).filter(Boolean);

  // 高亮:取叶 key 中 # 前真实路径与当前 pathname 相等者(或占位 key 直接匹配)
  const selectedKeys = items
    .flatMap((g) => g!.children.map((c) => c.key))
    .filter((k) => k.split("#")[0] === loc.pathname);

  const currentUser = localStorage.getItem("erp_user") || "用户";
  const logout = () => {
    localStorage.removeItem("erp_token");
    localStorage.removeItem("erp_user");
    nav("/login");
  };

  const primary = theme.antd.token?.colorPrimary as string;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={232}
        breakpoint="lg"
        collapsedWidth={0}
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
          selectedKeys={selectedKeys}
          items={items}
          onClick={(e) => nav(e.key.split("#")[0])}
          style={{ borderInlineEnd: 0, background: "transparent" }}
        />
      </Sider>

      <Layout>
        <Header
          className="erp-header"
          style={{
            background: theme.headerBg, padding: "0 24px", height: 60, lineHeight: "60px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderBottom: theme.headerBorder, position: "sticky", top: 0, zIndex: 9,
          }}
        >
          <span style={{ fontSize: 15, fontWeight: 700, color: theme.headerColor }}>
            {titleFor(loc.pathname)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Avatar size={28} style={{ background: primary, fontSize: 13 }}>{currentUser.slice(0, 1)}</Avatar>
              <span style={{ color: theme.headerColor, opacity: 0.85, fontSize: 13, fontWeight: 600 }}>{currentUser}</span>
            </span>
            <Button size="small" onClick={logout}>退出</Button>
          </span>
        </Header>

        <Content className="erp-content" style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
