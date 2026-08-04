import { useEffect } from "react";
import { Card, Spin } from "antd";
import { logout } from "../../auth/logout";

// 退出软件:清令牌回登录页(路由接线后菜单「退出软件」指向 /logout)
export default function LogoutPage() {
  useEffect(() => { logout(); }, []);
  return (
    <Card style={{ display: "grid", placeItems: "center", minHeight: 240 }}>
      <Spin tip="正在退出…" />
    </Card>
  );
}
