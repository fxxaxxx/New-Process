import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Space, Table, message } from "antd";
import { productionReportApi, type ProcessShortageRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "生产制单";
const d10 = (v?: string | null) => v?.slice(0, 10);
const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;

export default function ProcessShortagePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [rows, setRows] = useState<ProcessShortageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await productionReportApi.processShortage(kw)); }
    catch { message.error("加载 生产加工缺料表 失败"); }
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
    { title: "需求数量", dataIndex: "需求数量", width: 100, align: "right" as const, render: num },
    { title: "库存数量", dataIndex: "库存数量", width: 100, align: "right" as const, render: num },
    { title: "已领数量", dataIndex: "已领数量", width: 100, align: "right" as const, render: num },
    { title: "缺料数量", dataIndex: "缺料数量", width: 100, align: "right" as const, render: num },
  ];

  const exportCols: ExportCol[] = [
    { title: "制单日期", key: "制单日期", fmt: (v) => (typeof v === "string" ? v.slice(0, 10) : "") },
    { title: "生产单号", key: "生产单号" },
    { title: "款号", key: "款号" },
    { title: "合同号", key: "合同号" },
    { title: "物料编号", key: "物料编号" },
    { title: "物料名称", key: "物料名称" },
    { title: "规格", key: "规格" },
    { title: "颜色", key: "颜色" },
    { title: "单位", key: "单位" },
    { title: "需求数量", key: "需求数量" },
    { title: "库存数量", key: "库存数量" },
    { title: "已领数量", key: "已领数量" },
    { title: "缺料数量", key: "缺料数量" },
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
    <Card title="生产加工缺料表" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="生产单号 / 款号 / 物料编号 / 物料名称" allowClear style={{ width: 320 }}
          onSearch={(v) => load(v)}
        />
        <Button onClick={() => downloadCsv("生产加工缺料表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("生产加工缺料表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条（仅缺料行）</span>
      </Space>
      <Table
        size="small" rowKey={(_, i) => `ps-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1500, y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
