import { Alert, Card, Typography, Steps } from "antd";

// 还原数据:危险操作,本系统不提供在线还原——仅展示操作指引,须由 DBA 在服务端执行
export default function RestorePage() {
  return (
    <Card title="还原数据" variant="borderless">
      <Alert type="error" showIcon style={{ marginBottom: 16, maxWidth: 720 }}
        message="还原会覆盖当前全部业务数据,且不可逆"
        description="为防止误操作,本系统不提供在线还原功能。如需还原,请联系数据库管理员(DBA)在数据库服务器上执行,操作前务必先对当前库做一次备份。" />
      <Card type="inner" title="DBA 服务端还原指引" style={{ maxWidth: 720 }}>
        <Steps direction="vertical" current={-1}
          items={[
            { title: "备份当前库", description: "先在「备份数据」页或直接用 BACKUP DATABASE 留存当前状态,防还原错文件。" },
            { title: "确认备份文件", description: "从备份目录选取目标 .bak 文件,核对生成时间(文件名格式:库名_yyyyMMdd_HHmmss.bak)。" },
            { title: "踢出在线连接", description: "停止 ERP API 与前端访问,或将库设为 SINGLE_USER WITH ROLLBACK IMMEDIATE。" },
            { title: "执行 RESTORE", description: "RESTORE DATABASE [库名] FROM DISK = '备份文件路径' WITH REPLACE, RECOVERY;" },
            { title: "验证并恢复服务", description: "抽查关键表数据无误后,恢复 MULTI_USER 并重启 ERP API。" },
          ]} />
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
          还原后建议立即核对库存汇总与最近单据;如有差异以备份文件为准排查。
        </Typography.Paragraph>
      </Card>
    </Card>
  );
}
