import { useState } from "react";
import { Alert, Button, Card, Popconfirm, Typography, message } from "antd";
import { adminToolsApi, type BackupResult } from "../../api/adminTools";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "备份数据";

// 备份数据:触发服务端 BACKUP DATABASE,备份目录由 系统配置表[备份.目录] 或环境变量 ERP_BACKUP_DIR 配置
export default function BackupPage() {
  const perms = usePerms();
  const allowed = can(perms, MENU, "功能");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BackupResult | null>(null);

  const run = async () => {
    setRunning(true); setResult(null);
    try {
      const r = await adminToolsApi.backup();
      setResult(r);
      message.success(r.消息 ?? "备份完成");
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "备份失败");
    } finally { setRunning(false); }
  };

  return (
    <Card title="备份数据" variant="borderless">
      <Alert type="info" showIcon style={{ marginBottom: 16, maxWidth: 720 }}
        message="备份在 SQL Server 服务端执行"
        description="备份文件写入数据库服务器上的备份目录(由系统配置表键 [备份.目录] 或环境变量 ERP_BACKUP_DIR 指定,需为服务端绝对路径)。备份期间请勿关机或重启数据库服务。" />
      {allowed ? (
        <Popconfirm title="确认立即备份数据库?" onConfirm={run}>
          <Button type="primary" loading={running}>立即备份</Button>
        </Popconfirm>
      ) : (
        <Alert type="warning" showIcon message="当前账号无「备份数据·功能」权限" />
      )}
      {result?.文件 && (
        <Typography.Paragraph style={{ marginTop: 16 }} copyable={{ text: result.文件 }}>
          备份文件:<Typography.Text code>{result.文件}</Typography.Text>
        </Typography.Paragraph>
      )}
    </Card>
  );
}
