import { useCallback, useEffect, useState } from "react";
import { Card, Input, Select, Space, Table, Tag, message } from "antd";
import { productionReportApi, type ProductionTrackingRow } from "../../api/productionReports";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const d10 = (v?: string | null) => v?.slice(0, 10);

export default function ProductionTrackingPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [keyword, setKeyword] = useState("");
  const [审核Filter, set审核Filter] = useState<"all" | "1" | "0">("all");
  const [完成Filter, set完成Filter] = useState<"all" | "是" | "否">("all");
  const [rows, setRows] = useState<ProductionTrackingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (kw: string, 审核: typeof 审核Filter, 完成: typeof 完成Filter) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await productionReportApi.tracking(
        kw,
        审核 === "all" ? undefined : 审核,
        完成 === "all" ? undefined : 完成,
      ));
    } catch { message.error("加载 生产单跟踪表 失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(keyword, 审核Filter, 完成Filter); }, [load, 审核Filter, 完成Filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (v: string) => { setKeyword(v); load(v, 审核Filter, 完成Filter); };

  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;
  const 完成Tag = (v?: string) => v === "是"
    ? <Tag color="blue">是</Tag> : <Tag>否</Tag>;
  const num = (v?: number | null) => (v === null || v === undefined) ? "" : v;
  const 未完成Cell = (v?: number | null) => {
    const n = v ?? 0;
    return n > 0 ? <span style={{ color: "#cf1322", fontWeight: 600 }}>{n}</span> : n;
  };

  const columns = [
    { title: "标识", dataIndex: "标识", width: 72 },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", width: 120 },
    { title: "款式", dataIndex: "款式", width: 140 },
    { title: "客户名称", dataIndex: "客户名称", width: 160 },
    { title: "日期", dataIndex: "日期", width: 110, render: d10 },
    { title: "下单日期", dataIndex: "下单日期", width: 110, render: d10 },
    { title: "交货日期", dataIndex: "交货日期", width: 110, render: d10 },
    { title: "计划数量", dataIndex: "计划数量", width: 90, align: "right" as const, render: num },
    { title: "裁床数量", dataIndex: "裁床数量", width: 90, align: "right" as const, render: num },
    { title: "录入数量", dataIndex: "录入数量", width: 90, align: "right" as const, render: num },
    { title: "未完成数", dataIndex: "未完成数", width: 90, align: "right" as const, render: 未完成Cell },
    { title: "装箱方式", dataIndex: "装箱方式", width: 110 },
    { title: "订单总箱数", dataIndex: "订单总箱数", width: 100, align: "right" as const },
    { title: "完成", dataIndex: "完成", width: 72, align: "center" as const, render: 完成Tag },
    { title: "审核", dataIndex: "审核", width: 90, align: "center" as const, render: 审核Tag },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="生产单跟踪表" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="生产单号 / 款号 / 款式 / 客户" allowClear style={{ width: 280 }}
          onSearch={onSearch}
        />
        <span>审核：</span>
        <Select
          value={审核Filter} style={{ width: 120 }} onChange={set审核Filter}
          options={[
            { value: "all", label: "全部" },
            { value: "1", label: "已审核" },
            { value: "0", label: "未审核" },
          ]}
        />
        <span>完成：</span>
        <Select
          value={完成Filter} style={{ width: 120 }} onChange={set完成Filter}
          options={[
            { value: "all", label: "全部" },
            { value: "是", label: "已完成" },
            { value: "否", label: "未完成" },
          ]}
        />
      </Space>

      <Table
        size="small" rowKey={(_, i) => `t-${i}`} loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: 1700, y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: (t) => `共 ${t} 条` }}
      />
    </Card>
  );
}
