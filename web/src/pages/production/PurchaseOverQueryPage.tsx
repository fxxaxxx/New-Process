import { useCallback, useEffect, useState } from "react";
import { Card, Input, Space, Table, message } from "antd";
import { productionReportApi, type PurchaseOverRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const d10 = (v?: string | null) => v?.slice(0, 10);
const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;

export default function PurchaseOverQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [rows, setRows] = useState<PurchaseOverRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.purchaseOver(kw)); }
    catch { message.error("加载 采购超数查询 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

  const 超数Cell = (v?: number | null) =>
    <span style={{ color: "#cf1322", fontWeight: 600 }}>{num(v)}</span>;

  const columns = [
    { title: "制单日期", dataIndex: "制单日期", width: 110, render: d10 },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", width: 120 },
    { title: "合同号", dataIndex: "合同号", width: 120 },
    { title: "物料编号", dataIndex: "物料编号", width: 130, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 160 },
    { title: "规格", dataIndex: "规格", width: 120 },
    { title: "颜色", dataIndex: "颜色", width: 100 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "需求数量", dataIndex: "需求数量", width: 100, align: "right" as const, render: num },
    { title: "已采购数量", dataIndex: "已采购数量", width: 110, align: "right" as const, render: num },
    { title: "超数", dataIndex: "超数", width: 100, align: "right" as const, render: 超数Cell },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="采购超数查询" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="生产单号 / 款号 / 物料编号 / 物料名称" allowClear style={{ width: 320 }}
          onSearch={(v) => load(v)}
        />
      </Space>
      <Table
        size="small" rowKey={(_, i) => `p-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1400 }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
