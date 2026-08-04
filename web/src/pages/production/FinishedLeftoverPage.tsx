import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Space, Table, message } from "antd";
import { productionReportApi, type FinishedLeftoverRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "生产制单";
const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;

export default function FinishedLeftoverPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [rows, setRows] = useState<FinishedLeftoverRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.finishedLeftover(kw)); }
    catch { message.error("加载 成品余料统计表 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

  const columns = [
    { title: "款号", dataIndex: "款号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "客户", dataIndex: "客户", width: 160 },
    { title: "名称", dataIndex: "名称", width: 180 },
    { title: "入仓数量", dataIndex: "入仓数量", width: 110, align: "right" as const, render: num },
    { title: "出仓数量", dataIndex: "出仓数量", width: 110, align: "right" as const, render: num },
    { title: "余数", dataIndex: "余数", width: 110, align: "right" as const, render: num },
  ];

  const exportCols: ExportCol[] = [
    { title: "款号", key: "款号" },
    { title: "客户", key: "客户" },
    { title: "名称", key: "名称" },
    { title: "入仓数量", key: "入仓数量" },
    { title: "出仓数量", key: "出仓数量" },
    { title: "余数", key: "余数" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="成品余料统计表" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="款号 / 客户 / 名称" allowClear style={{ width: 280 }}
          onSearch={(v) => load(v)}
        />
        <Button onClick={() => downloadCsv("成品余料统计表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("成品余料统计表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table
        size="small" rowKey={(_, i) => `fl-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 900, y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
