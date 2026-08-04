import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Space, Table, message } from "antd";
import { productionReportApi, type ContractLeftoverRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "生产制单";
const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;

export default function ContractLeftoverPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [rows, setRows] = useState<ContractLeftoverRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.contractLeftover(kw)); }
    catch { message.error("加载 合同余料统计表 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(""); }, [load]);

  const columns = [
    { title: "合同号", dataIndex: "合同号", width: 130, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料编号", dataIndex: "物料编号", width: 130, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 160 },
    { title: "规格", dataIndex: "规格", width: 120 },
    { title: "颜色", dataIndex: "颜色", width: 100 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "需求数量", dataIndex: "需求数量", width: 100, align: "right" as const, render: num },
    { title: "采购数量", dataIndex: "采购数量", width: 100, align: "right" as const, render: num },
    { title: "余料数量", dataIndex: "余料数量", width: 100, align: "right" as const, render: num },
  ];

  const exportCols: ExportCol[] = [
    { title: "合同号", key: "合同号" },
    { title: "物料编号", key: "物料编号" },
    { title: "物料名称", key: "物料名称" },
    { title: "规格", key: "规格" },
    { title: "颜色", key: "颜色" },
    { title: "单位", key: "单位" },
    { title: "需求数量", key: "需求数量" },
    { title: "采购数量", key: "采购数量" },
    { title: "余料数量", key: "余料数量" },
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
    <Card title="合同余料统计表" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="合同号 / 物料编号 / 物料名称" allowClear style={{ width: 300 }}
          onSearch={(v) => load(v)}
        />
        <Button onClick={() => downloadCsv("合同余料统计表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("合同余料统计表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table
        size="small" rowKey={(_, i) => `cl-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1100, y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
