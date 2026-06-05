import { useState, type ReactNode } from "react";
import { Layout, Menu, Button, Avatar } from "antd";
import {
  TeamOutlined, ShopOutlined, ToolOutlined, AppstoreOutlined,
  ApartmentOutlined, IdcardOutlined, TagsOutlined, ProfileOutlined,
  DatabaseOutlined, SkinOutlined, ShoppingCartOutlined, FileTextOutlined,
  BuildOutlined, ShoppingOutlined, ImportOutlined, ExportOutlined, ContainerOutlined,
  ScissorOutlined, FormOutlined, BarChartOutlined,
  SendOutlined, RollbackOutlined, ReconciliationOutlined,
  InboxOutlined, AuditOutlined,
} from "@ant-design/icons";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";
import { useTheme } from "../theme/ThemeContext";
import { MASTER_CONFIGS } from "./master/configs";

const { Sider, Header, Content } = Layout;

function iconFor(menu: string): ReactNode {
  if (menu.includes("款号")) return <SkinOutlined />;
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
  const { theme } = useTheme();
  const [openKeys, setOpenKeys] = useState<string[]>([]);   // 默认全折叠,点击菜单组才展开

  const children = Object.values(MASTER_CONFIGS)
    .filter((c) => can(perms, c.menu, "打开"))
    .map((c) => ({ key: `/master/${encodeURIComponent(c.menu)}`, label: c.title, icon: iconFor(c.menu) }));
  const bizChildren = [
    ...(can(perms, "成品客户订货单", "打开")
      ? [{ key: "/orders", label: "客户订单", icon: <ShoppingCartOutlined /> }] : []),
    ...(can(perms, "生产制单", "打开")
      ? [{ key: "/production", label: "生产制单", icon: <BuildOutlined /> }] : []),
  ];
  const matChildren = [
    ...(can(perms, "采购入仓单", "打开") ? [{ key: "/materials/purchase-receipts", label: "采购入仓", icon: <ImportOutlined /> }] : []),
    ...(can(perms, "领料单", "打开") ? [{ key: "/materials/material-issues", label: "领料单", icon: <ExportOutlined /> }] : []),
    ...(can(perms, "退料单", "打开") ? [{ key: "/materials/material-returns", label: "退料单", icon: <ImportOutlined /> }] : []),
    ...(can(perms, "物料库存", "打开") ? [{ key: "/material-inventory", label: "物料库存", icon: <ContainerOutlined /> }] : []),
  ];
  const wsChildren = [
    ...(can(perms, "裁床单", "打开") ? [{ key: "/cuttings", label: "裁床单", icon: <ScissorOutlined /> }] : []),
    ...(can(perms, "计件", "打开") ? [{ key: "/piecework", label: "计件录入", icon: <FormOutlined /> }] : []),
    ...(can(perms, "计件汇总", "打开") ? [{ key: "/piecework-summary", label: "计件汇总", icon: <BarChartOutlined /> }] : []),
  ];
  const osChildren = [
    ...(can(perms, "发外加工", "打开") ? [{ key: "/outsourcing", label: "发外派工", icon: <SendOutlined /> }] : []),
    ...(can(perms, "发外回收", "打开") ? [{ key: "/outsourcing-returns", label: "发外回收", icon: <RollbackOutlined /> }] : []),
    ...(can(perms, "发外对数", "打开") ? [{ key: "/outsourcing-reconcile", label: "发外对数", icon: <ReconciliationOutlined /> }] : []),
  ];
  const fgChildren = [
    ...(can(perms, "成品入仓", "打开") ? [{ key: "/finished-receipts", label: "成品入仓", icon: <InboxOutlined /> }] : []),
    ...(can(perms, "成品出仓", "打开") ? [{ key: "/finished-issues", label: "成品出仓", icon: <ExportOutlined /> }] : []),
    ...(can(perms, "成品盘点", "打开") ? [{ key: "/finished-stocktakes", label: "成品盘点", icon: <AuditOutlined /> }] : []),
    ...(can(perms, "成品库存", "打开") ? [{ key: "/finished-inventory", label: "成品库存", icon: <DatabaseOutlined /> }] : []),
  ];
  const items = [
    { key: "base", label: "基础资料", icon: <DatabaseOutlined />, children },
    ...(bizChildren.length
      ? [{ key: "biz", label: "业务单据", icon: <FileTextOutlined />, children: bizChildren }] : []),
    ...(matChildren.length ? [{ key: "mat", label: "物料管理", icon: <ShoppingOutlined />, children: matChildren }] : []),
    ...(wsChildren.length ? [{ key: "ws", label: "生产车间", icon: <ScissorOutlined />, children: wsChildren }] : []),
    ...(osChildren.length ? [{ key: "os", label: "发外加工", icon: <SendOutlined />, children: osChildren }] : []),
    ...(fgChildren.length ? [{ key: "fg", label: "成品仓储", icon: <InboxOutlined />, children: fgChildren }] : []),
  ];

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
          <span style={{ fontSize: 15, fontWeight: 700, color: theme.headerColor }}>
            {loc.pathname.startsWith("/orders") ? "客户订单"
              : loc.pathname.startsWith("/production") ? "生产制单"
              : loc.pathname.startsWith("/styles") ? "款式详情"
              : loc.pathname.startsWith("/material-inventory") ? "物料库存"
              : loc.pathname.startsWith("/materials/") ? "物料单据"
              : loc.pathname.startsWith("/cuttings") ? "裁床单"
              : loc.pathname.startsWith("/piecework-summary") ? "计件汇总"
              : loc.pathname.startsWith("/piecework") ? "计件录入"
              : loc.pathname.startsWith("/outsourcing-reconcile") ? "发外对数"
              : loc.pathname.startsWith("/outsourcing-returns") ? "发外回收"
              : loc.pathname.startsWith("/outsourcing") ? "发外派工"
              : loc.pathname.startsWith("/finished-receipts") ? "成品入仓"
              : loc.pathname.startsWith("/finished-issues") ? "成品出仓"
              : loc.pathname.startsWith("/finished-stocktakes") ? "成品盘点"
              : loc.pathname.startsWith("/finished-inventory") ? "成品库存"
              : "基础资料"}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
