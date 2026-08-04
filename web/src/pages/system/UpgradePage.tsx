import { useEffect, useState } from "react";
import { Alert, Card, Descriptions, Spin, message } from "antd";
import { adminToolsApi, type VersionInfo } from "../../api/adminTools";

// 网上升级:显示当前系统版本;升级本身由运维在服务端部署发布包完成
export default function UpgradePage() {
  const [info, setInfo] = useState<VersionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminToolsApi.version()
      .then(setInfo)
      .catch(() => message.error("获取系统版本失败"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card title="网上升级" variant="borderless">
      <Alert type="info" showIcon style={{ marginBottom: 16, maxWidth: 720 }}
        message="系统升级由运维在服务端执行"
        description="新版本发布包由运维部署到服务器(参考 docs/deploy-windows-task.md),本页用于查看当前运行版本,便于与发布版本比对。" />
      <Spin spinning={loading}>
        {info && (
          <Descriptions bordered column={1} style={{ maxWidth: 720 }}>
            <Descriptions.Item label="程序集版本">{info.版本 || "-"}</Descriptions.Item>
            <Descriptions.Item label="构建信息">{info.信息版本 || "-"}</Descriptions.Item>
            <Descriptions.Item label="运行时">{info.框架 || "-"}</Descriptions.Item>
            <Descriptions.Item label="环境">{info.环境 || "-"}</Descriptions.Item>
          </Descriptions>
        )}
      </Spin>
    </Card>
  );
}
