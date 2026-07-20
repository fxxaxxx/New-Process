import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  assemblyPurchaseQueryApi,
  type AssemblyRequiredMaterialRow,
} from "../../api/assemblyPurchaseQuery";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildRequiredMaterialQuery,
  REQUIRED_MATERIAL_ALL,
  requiredMaterialOrderPath,
} from "../../utils/assemblyRequiredMaterials";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "款号资料";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];
const fmtDate = (v?: string | null) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v).toLocaleString());
const fmtAudit = (v?: string | null) => (v === "1" || v === "已审核" ? "已审核" : "");

export default function AssemblyRequiredMaterialDetailPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const navigate = useNavigate();
  const [warehouse, setWarehouse] = useState(REQUIRED_MATERIAL_ALL);
  const [materialType, setMaterialType] = useState(REQUIRED_MATERIAL_ALL);
  const [audit, setAudit] = useState(REQUIRED_MATERIAL_ALL);
  const [dateField, setDateField] = useState("日期");
  const [condition, setCondition] = useState("单号");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<AssemblyRequiredMaterialRow[]>([]);
  const [loading, setLoading] = useState(false);

  const query = useMemo(() => buildRequiredMaterialQuery({
    起: range[0].format("YYYY-MM-DD"),
    止: range[1].format("YYYY-MM-DD"),
    keyword,
    收货仓库: warehouse,
    类型: materialType,
    审核情况: audit,
  }), [audit, keyword, materialType, range, warehouse]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await assemblyPurchaseQueryApi.requiredMaterials(query));
    } catch {
      message.error("加载装配需领明细表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, query]);

  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const openOrder = (row: AssemblyRequiredMaterialRow) => {
    const path = requiredMaterialOrderPath(row);
    if (path) navigate(path);
  };

  const columns: ColumnsType<AssemblyRequiredMaterialRow> = [
    { title: "日期", dataIndex: "日期", width: 105, render: fmtDate },
    { title: "单号", dataIndex: "单号", width: 120, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "收货仓库", dataIndex: "收货仓库", width: 95 },
    { title: "供应商编号", dataIndex: "供应商编号", width: 100 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 170 },
    { title: "产品货号", dataIndex: "产品货号", width: 130, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 180 },
    { title: "装配方式", dataIndex: "装配方式", width: 135 },
    { title: "生产单号", dataIndex: "生产单号", width: 130, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "物料编号", dataIndex: "物料编号", width: 120, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 190 },
    { title: "需领数量", dataIndex: "需领数量", width: 105, align: "right", render: fmtNum },
    { title: "审核", dataIndex: "审核", width: 80, render: fmtAudit },
  ];

  const exportCols: ExportCol[] = columns.map(c => {
    const key = String((c as { dataIndex?: string }).dataIndex ?? "");
    return {
      title: String(c.title),
      key,
      fmt: key === "日期"
        ? v => fmtDate(typeof v === "string" ? v : undefined)
        : key === "审核"
          ? v => fmtAudit(typeof v === "string" ? v : undefined)
          : undefined,
    };
  });

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权限访问该页面</div></Card>;
  }

  return (
    <Card title="装配需领明细表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <span>收货仓库</span>
        <Select
          value={warehouse}
          onChange={setWarehouse}
          style={{ width: 120 }}
          options={[REQUIRED_MATERIAL_ALL, "成品仓", "半成品仓"].map(v => ({ value: v, label: v }))}
        />
        <span>类型</span>
        <Select
          value={materialType}
          onChange={setMaterialType}
          style={{ width: 140 }}
          options={[REQUIRED_MATERIAL_ALL, "成品", "半成品", "未包装半成品"].map(v => ({ value: v, label: v }))}
        />
        <span>审核情况</span>
        <Select
          value={audit}
          onChange={setAudit}
          style={{ width: 120 }}
          options={[REQUIRED_MATERIAL_ALL, "已审核", "未审核"].map(v => ({ value: v, label: v }))}
        />
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <span>请选择条件</span>
        <Select
          value={condition}
          onChange={setCondition}
          style={{ width: 125 }}
          options={["单号", "生产单号", "产品货号", "产品装配名称", "物料编号", "物料名称", "供应商名称"].map(v => ({ value: v, label: v }))}
        />
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
        <Select
          value={dateField}
          onChange={setDateField}
          style={{ width: 105 }}
          options={["日期"].map(v => ({ value: v, label: v }))}
        />
        <DatePicker.RangePicker
          value={range}
          allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }}
        />
        <Button disabled>表格设置</Button>
        <Button onClick={() => downloadCsv("装配需领明细表.csv", exportCols, rows as unknown as Record<string, unknown>[])}>导出EXCEL</Button>
        <Button onClick={() => printTable("装配需领明细表", exportCols, rows as unknown as Record<string, unknown>[])}>打印</Button>
        <Button danger onClick={() => window.history.back()}>关闭</Button>
      </Space>
      <Table
        rowKey={(r, i) => `${r.单号 ?? "order"}-${r.物料编号 ?? "material"}-${i}`}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content", y: 620 }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        onRow={record => ({
          onDoubleClick: () => openOrder(record),
          style: { cursor: record.单号 ? "pointer" : "default" },
        })}
      />
    </Card>
  );
}
