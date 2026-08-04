import { useCallback, useEffect, useState } from "react";
import { Card, DatePicker, Input, Space, Table, message } from "antd";
import type { Dayjs } from "dayjs";
import { productionReportApi, type PurchaseIssueAnalysisRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const d10 = (v?: string | null) => v?.slice(0, 10);
const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;

export default function PurchaseIssueAnalysisPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [rows, setRows] = useState<PurchaseIssueAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async (r: [Dayjs | null, Dayjs | null], kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await productionReportApi.purchaseIssueAnalysis(
        r[0]?.format("YYYY-MM-DD"), r[1]?.format("YYYY-MM-DD"), kw || undefined));
    }
    catch { message.error("加载 采购领料分析表 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(range, keyword); }, [load]); // eslint-disable-line react-hooks/exhaustive-deps

  // 差异=需求−已领：正=欠领(橙)，负=超领(红)
  const 差异Cell = (v?: number | null) => {
    if (v === null || v === undefined || v === 0) return <span>{num(v)}</span>;
    return (
      <span style={{ color: v > 0 ? "#fa8c16" : "#cf1322", fontWeight: 600 }}>{num(v)}</span>
    );
  };

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
    { title: "采购数量", dataIndex: "采购数量", width: 100, align: "right" as const, render: num },
    { title: "已领数量", dataIndex: "已领数量", width: 100, align: "right" as const, render: num },
    { title: "库存数量", dataIndex: "库存数量", width: 100, align: "right" as const, render: num },
    { title: "可用库存", dataIndex: "可用库存", width: 100, align: "right" as const, render: num },
    { title: "需订数量", dataIndex: "需订数量", width: 100, align: "right" as const, render: num },
    { title: "差异", dataIndex: "差异", width: 100, align: "right" as const, render: 差异Cell },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card
      title="采购领料分析表" variant="borderless"
      extra={<span style={{ color: "#8c8c8c", fontSize: 13 }}>差异=需求−已领：<span style={{ color: "#fa8c16" }}>正数=欠领</span>，<span style={{ color: "#cf1322" }}>负数=超领</span></span>}
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <span style={{ color: "#8c8c8c" }}>制单日期</span>
        <DatePicker.RangePicker
          value={range}
          onChange={(v) => {
            const r: [Dayjs | null, Dayjs | null] = [v?.[0] ?? null, v?.[1] ?? null];
            setRange(r);
            load(r, keyword);
          }}
        />
        <Input.Search
          placeholder="生产单号 / 款号 / 物料编号 / 物料名称" allowClear style={{ width: 320 }}
          onSearch={(v) => { setKeyword(v); load(range, v); }}
        />
      </Space>
      <Table
        size="small" rowKey={(_, i) => `pia-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1800, y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
