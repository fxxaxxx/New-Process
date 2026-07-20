import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  assemblyPurchaseQueryApi,
  type AssemblyFactoryCategoryMonthlyRow,
} from "../../api/assemblyPurchaseQuery";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildFactoryCategoryMonthlyQuery,
  FACTORY_CATEGORY_MONTHLY_ALL,
} from "../../utils/assemblyFactoryCategoryMonthly";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "款号资料";
const factoriesApi = masterApi("factories");
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];
const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v).toLocaleString());

interface FactoryPick {
  加工厂编号?: string;
  加工厂名称?: string;
}

export default function AssemblyFactoryCategoryMonthlyPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [condition, setCondition] = useState("加工厂名称");
  const [factory, setFactory] = useState(FACTORY_CATEGORY_MONTHLY_ALL);
  const [keyword, setKeyword] = useState("");
  const [factories, setFactories] = useState<FactoryPick[]>([]);
  const [rows, setRows] = useState<AssemblyFactoryCategoryMonthlyRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canOpen) return;
    factoriesApi.list(1, 500, "")
      .then(r => setFactories(r.items as FactoryPick[]))
      .catch(() => setFactories([]));
  }, [canOpen]);

  const query = useMemo(() => buildFactoryCategoryMonthlyQuery({
    起: range[0].format("YYYY-MM-DD"),
    止: range[1].format("YYYY-MM-DD"),
    加工厂: factory,
    keyword,
  }), [factory, keyword, range]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await assemblyPurchaseQueryApi.factoryCategoryMonthly(query));
    } catch {
      message.error("加载加工厂分类月报表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, query]);

  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const factoryOptions = useMemo(() => [
    { value: FACTORY_CATEGORY_MONTHLY_ALL, label: FACTORY_CATEGORY_MONTHLY_ALL },
    ...factories
      .filter(f => f.加工厂编号 || f.加工厂名称)
      .map(f => {
        const label = `${f.加工厂编号 ?? ""} ${f.加工厂名称 ?? ""}`.trim();
        return { value: label, label };
      }),
  ], [factories]);

  const columns: ColumnsType<AssemblyFactoryCategoryMonthlyRow> = [
    { title: "加工厂编号", dataIndex: "加工厂编号", width: 105 },
    { title: "加工厂名称", dataIndex: "加工厂名称", width: 180 },
    { title: "收货仓库", dataIndex: "收货仓库", width: 95 },
    { title: "物料分类", dataIndex: "物料分类", width: 120 },
    { title: "产品款数", dataIndex: "产品款数", width: 95, align: "right", render: fmtNum },
    { title: "物料款数", dataIndex: "物料款数", width: 95, align: "right", render: fmtNum },
    { title: "领料数量", dataIndex: "领料数量", width: 105, align: "right", render: fmtNum },
    { title: "送货数量", dataIndex: "送货数量", width: 105, align: "right", render: fmtNum },
    { title: "库存数量", dataIndex: "库存数量", width: 105, align: "right", render: fmtNum },
    { title: "起始日期", dataIndex: "起始日期", width: 105, render: fmtDate },
    { title: "截止日期", dataIndex: "截止日期", width: 105, render: fmtDate },
  ];

  const exportCols: ExportCol[] = columns.map(c => {
    const key = String((c as { dataIndex?: string }).dataIndex ?? "");
    return {
      title: String(c.title),
      key,
      fmt: key.includes("日期") ? v => fmtDate(typeof v === "string" ? v : undefined) : undefined,
    };
  });

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权限访问该页面</div></Card>;
  }

  return (
    <Card title="加工厂分类月报表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <span>请选择条件</span>
        <Select
          value={condition}
          onChange={setCondition}
          style={{ width: 125 }}
          options={["加工厂名称", "加工厂编号", "物料分类"].map(v => ({ value: v, label: v }))}
        />
        <Select
          showSearch
          value={factory}
          onChange={setFactory}
          style={{ width: 260 }}
          optionFilterProp="label"
          options={factoryOptions}
        />
        <Button onClick={load}>选择</Button>
        <span>查询</span>
        <Input.Search
          allowClear
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onSearch={load}
          style={{ width: 260 }}
        />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={load}>精确查询</Button>
      </Space>
      <Space style={{ marginBottom: 12 }} wrap>
        <span>日期</span>
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }}
        />
        <Button disabled>表格设置</Button>
        <Button onClick={() => downloadCsv("加工厂分类月报表.csv", exportCols, rows as unknown as Record<string, unknown>[])}>导出EXCEL</Button>
        <Button onClick={() => printTable("加工厂分类月报表", exportCols, rows as unknown as Record<string, unknown>[])}>打印</Button>
        <Button danger onClick={() => window.history.back()}>关闭</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table
        rowKey={(r, i) => `${r.加工厂编号 ?? "factory"}-${r.收货仓库 ?? "warehouse"}-${r.物料分类 ?? "category"}-${i}`}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content", y: 620 }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
      />
    </Card>
  );
}
