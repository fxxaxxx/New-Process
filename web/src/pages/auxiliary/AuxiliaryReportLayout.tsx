import type { CSSProperties, ReactNode } from "react";
import { CloseOutlined, ExportOutlined, PrinterOutlined, SettingOutlined } from "@ant-design/icons";
import { Button, Card, Space, Tag } from "antd";

type AuxiliaryReportLayoutProps = {
  title: string;
  recordCount?: number;
  children: ReactNode;
};

export function AuxiliaryReportLayout({ title, recordCount, children }: AuxiliaryReportLayoutProps) {
  return (
    <Card
      title={title}
      variant="borderless"
      extra={
        <Space wrap size={8}>
          {typeof recordCount === "number" ? <Tag color="blue">记录 {recordCount}</Tag> : null}
          <Button icon={<SettingOutlined />}>表格设置</Button>
          <Button icon={<ExportOutlined />} disabled>导出EXCEL</Button>
          <Button icon={<PrinterOutlined />} disabled>打印</Button>
          <Button danger icon={<CloseOutlined />} onClick={() => window.history.back()}>关闭</Button>
        </Space>
      }
      styles={{ body: { padding: 24 } }}
    >
      {children}
    </Card>
  );
}

export const auxiliaryReportFilterPanelStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
  marginBottom: 16,
};

export const auxiliaryReportFilterRowStyle: CSSProperties = {
  minHeight: 32,
};

export const auxiliaryReportTableContainerStyle: CSSProperties = {
  width: "100%",
};

export const auxiliaryReportSplitStyle: CSSProperties = {
  display: "flex",
  gap: 16,
  minHeight: 560,
};

export const auxiliaryReportSidePanelStyle: CSSProperties = {
  width: 240,
  flex: "0 0 240px",
  border: "1px solid #edf0f5",
  borderRadius: 6,
  padding: 8,
  background: "#fff",
};

export const auxiliaryReportMainPanelStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
};
