import { useCallback, useEffect, useState } from "react";
import { Card, Input, Space, Table, message } from "antd";
import { productionReportApi, type OrderSummaryRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";

export default function OrderSummaryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [rows, setRows] = useState<OrderSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.orderSummary(kw)); }
    catch { message.error("加载 货号接单汇总表 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

  const columns = [
    { title: "货号", dataIndex: "货号", width: 200 },
    { title: "款式", dataIndex: "款式" },
    { title: "接单数量", dataIndex: "接单数量", width: 120, align: "right" as const },
    { title: "订单数", dataIndex: "订单数", width: 100, align: "right" as const },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="货号接单汇总表" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="货号 / 款式" allowClear style={{ width: 300 }}
          onSearch={(v) => load(v)}
        />
      </Space>
      <Table
        size="small" rowKey={(_, i) => `r-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 600 }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
