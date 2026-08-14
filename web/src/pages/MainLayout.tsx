import { useState } from "react";
import { Layout, Menu, Button, Avatar, Tooltip } from "antd";
import {
  AppstoreOutlined, SearchOutlined, HomeOutlined, PlusSquareOutlined, RocketOutlined,
  ShoppingCartOutlined, InboxOutlined, ExportOutlined, DatabaseOutlined, MenuUnfoldOutlined, MenuFoldOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";
import { useTheme } from "../theme/ThemeContext";
import { MENU_TREE } from "../nav/menuTree";
import CommandPalette from "../components/CommandPalette";

const { Sider, Header, Content } = Layout;

// 简易模式菜单：新手天天用的 7 个入口，默认只显示这些，其余收进「全部功能」。
// perm 对应菜单权限；页面本身也有权限兜底，没权限点进去会提示。
const SIMPLE_MENU: { label: string; path: string; perm?: string; icon: React.ReactNode }[] = [
  { label: "首页", path: "/", icon: <HomeOutlined /> },
  { label: "物料建档", path: "/material-create", perm: "物料资料", icon: <PlusSquareOutlined /> },
  { label: "生产通知单", path: "/production", perm: "生产制单", icon: <RocketOutlined /> },
  { label: "采购订单", path: "/purchase-orders", icon: <ShoppingCartOutlined /> },
  { label: "塑胶入仓", path: "/plastic-receipts", icon: <InboxOutlined /> },
  { label: "塑胶领料", path: "/plastic-issues", icon: <ExportOutlined /> },
  { label: "库存查询", path: "/material-inventory", icon: <DatabaseOutlined /> },
];

function titleFor(pathname: string): string {
  if (pathname.startsWith("/_todo/")) return decodeURIComponent(pathname.slice("/_todo/".length));
  for (const g of MENU_TREE) for (const leaf of g.children)
    if (leaf.path && pathname.startsWith(leaf.path)) return leaf.label;
  for (const m of SIMPLE_MENU) if (m.path !== "/" && pathname.startsWith(m.path)) return m.label;
  if (pathname === "/") return "首页";
  return "兴信B ERP";
}

export default function MainLayout() {
  const perms = usePerms();
  const nav = useNavigate();
  const loc = useLocation();
  const { theme } = useTheme();
  const [openKeys, setOpenKeys] = useState<string[]>([]);   // 默认全折叠,点击菜单组才展开
  // 简易模式：默认开启(localStorage 记忆)，新手只看到 7 个核心入口
  const [simple, setSimple] = useState<boolean>(() => localStorage.getItem("erp_simple_menu") !== "0");

  const toggleSimple = () => {
    setSimple(s => {
      localStorage.setItem("erp_simple_menu", s ? "0" : "1");
      return !s;
    });
  };

  // 完整菜单(按权限过滤)
  const fullItems = MENU_TREE.map((g) => {
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

  // 简易菜单(扁平,无分组)
  const simpleItems = SIMPLE_MENU
    .filter(m => !m.perm || can(perms, m.perm, "打开"))
    .map(m => ({ key: `${m.path}#${m.label}`, label: m.label, icon: m.icon }));

  const items = simple ? simpleItems : fullItems;

  // 高亮:取叶 key 中 # 前真实路径与当前 pathname 相等者
  const selectedKeys = items
    .flatMap((g) => ("children" in g && g.children ? g.children.map((c) => c.key) : [g.key]))
    .filter((k) => {
      const p = k.split("#")[0];
      return p === "/" ? loc.pathname === "/" : loc.pathname.startsWith(p) && p !== "/";
    });

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

        <div style={{ padding: "0 12px 10px" }}>
          <Tooltip title={simple ? "切换到全部功能菜单" : "切换到简易菜单(只显示常用)"}>
            <Button block size="small" type={simple ? "primary" : "default"}
              icon={simple ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={toggleSimple}>
              {simple ? "简易模式 · 全部功能" : "全部功能 · 简易模式"}
            </Button>
          </Tooltip>
        </div>

        <Menu
          theme={theme.siderTheme}
          mode="inline"
          openKeys={simple ? undefined : openKeys}
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
            <Button size="small" icon={<SearchOutlined />} onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))}>
              搜索 <span style={{ opacity: 0.6, fontSize: 11 }}>Ctrl+K</span>
            </Button>
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
      <CommandPalette />
    </Layout>
  );
}
