import { Layout, Menu } from "antd";
import { Outlet, useNavigate } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";
import { MASTER_CONFIGS } from "./master/configs";

export default function MainLayout() {
  const perms = usePerms();
  const nav = useNavigate();
  const masterChildren = Object.values(MASTER_CONFIGS)
    .filter(c => can(perms, c.menu, "打开"))
    .map(c => ({ key: `master/${encodeURIComponent(c.menu)}`, label: c.title }));
  const items = [{ key: "基础资料", label: "基础资料", children: masterChildren }];
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider><Menu theme="dark" mode="inline" items={items} defaultOpenKeys={["基础资料"]} onClick={e => nav("/" + e.key)} /></Layout.Sider>
      <Layout>
        <Layout.Header style={{ color: "#fff" }}>兴信B ERP</Layout.Header>
        <Layout.Content style={{ padding: 16 }}><Outlet /></Layout.Content>
      </Layout>
    </Layout>
  );
}
