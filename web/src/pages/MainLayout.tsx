import { Layout, Menu } from "antd";
import { Outlet } from "react-router-dom";
import { can } from "../auth/permissions";
import { usePerms } from "../auth/PermissionContext";

const ALL_MENUS = ["基础资料", "接单", "生产制单", "采购入仓", "成品入仓", "成品出仓", "工资计件", "系统设置"];

export default function MainLayout() {
  const perms = usePerms();
  // 只显示用户拥有"打开"权限的菜单
  const items = ALL_MENUS.filter((m) => can(perms, m, "打开")).map((m) => ({ key: m, label: m }));
  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Layout.Sider><Menu theme="dark" mode="inline" items={items} /></Layout.Sider>
      <Layout>
        <Layout.Header style={{ color: "#fff" }}>兴信B ERP</Layout.Header>
        <Layout.Content style={{ padding: 16 }}><Outlet /></Layout.Content>
      </Layout>
    </Layout>
  );
}
