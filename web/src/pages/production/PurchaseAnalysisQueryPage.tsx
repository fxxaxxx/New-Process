import { useCallback, useEffect, useState } from "react";
import { Card, Input, Space, Table, message } from "antd";
import { productionReportApi, type PurchaseAnalysisRow } from "../../api/productionReports";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const d10 = (v?: string | null) => v?.slice(0, 10);
const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;

export default function PurchaseAnalysisQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const maskPrice = hidePrice(perms, MENU);

  const [rows, setRows] = useState<PurchaseAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.purchaseAnalysis(kw)); }
    catch { message.error("加载 采购分析明细查询 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

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
    { title: "总数量", dataIndex: "总数量", width: 100, align: "right" as const, render: num },
    { title: "库存数量", dataIndex: "库存数量", width: 100, align: "right" as const, render: num },
    { title: "可用库存", dataIndex: "可用库存", width: 100, align: "right" as const, render: num },
    { title: "需订数量", dataIndex: "需订数量", width: 100, align: "right" as const, render: num },
    ...(maskPrice ? [] : [
      { title: "预算单价", dataIndex: "预算单价", width: 100, align: "right" as const, render: num },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: num },
    ]),
    { title: "供应商名称", dataIndex: "供应商名称", width: 160 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="采购分析明细查询" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="生产单号 / 款号 / 物料编号 / 物料名称" allowClear style={{ width: 320 }}
          onSearch={(v) => load(v)}
        />
      </Space>
      <Table
        size="small" rowKey={(_, i) => `pa-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1700 }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
