import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseOutlined,
  ExportOutlined,
  PrinterOutlined,
  SearchOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import {
  semiFinishedShortageAnalysisApi,
  type SemiFinishedShortageField,
  type SemiFinishedShortageQuery,
  type SemiFinishedShortageRow,
} from "../../api/semiFinishedShortageAnalysis";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  DEFAULT_SHORTAGE_QUERY,
  downloadShortageExport,
  formatShortageQuantity,
  normalizeShortageQuery,
} from "../../utils/semiFinishedShortageAnalysis";
import { printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "半成品欠料分析表";

const fieldOptions: { value: SemiFinishedShortageField; label: string }[] = [
  { value: "productCode", label: "产品货号" },
  { value: "productName", label: "产品名称" },
  { value: "customer", label: "客户" },
  { value: "partCode", label: "配件编号" },
];

const exportColumns: ExportCol[] = [
  { title: "客户", key: "customer" },
  { title: "产品货号", key: "productCode" },
  { title: "产品名称", key: "productName" },
  { title: "配件编号", key: "partCode" },
  { title: "产品装配名称", key: "assemblyName" },
  { title: "单位", key: "unit" },
  { title: "需求数量", key: "requiredQuantity", fmt: value => formatShortageQuantity(Number(value ?? 0)) },
  { title: "库存数量", key: "inventoryQuantity", fmt: value => formatShortageQuantity(Number(value ?? 0)) },
  { title: "欠料数量", key: "shortageQuantity", fmt: value => formatShortageQuantity(Number(value ?? 0)) },
];

const quantityColumn = (title: string, dataIndex: keyof SemiFinishedShortageRow, color?: string) => ({
  title,
  dataIndex,
  width: 130,
  align: "right" as const,
  render: (value: number) => color
    ? <span style={{ color, fontWeight: 600 }}>{formatShortageQuantity(value)}</span>
    : formatShortageQuantity(value),
});

export default function SemiFinishedShortageAnalysisPage() {
  const navigate = useNavigate();
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canPrint = can(perms, MENU, "打印");
  const [field, setField] = useState<SemiFinishedShortageField>(DEFAULT_SHORTAGE_QUERY.field);
  const [keyword, setKeyword] = useState("");
  const [activeQuery, setActiveQuery] = useState<SemiFinishedShortageQuery>(DEFAULT_SHORTAGE_QUERY);
  const [rows, setRows] = useState<SemiFinishedShortageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (query: SemiFinishedShortageQuery) => {
    const currentRequest = ++requestId.current;
    setRows([]);
    setTotal(0);
    setLoading(true);
    try {
      const result = await semiFinishedShortageAnalysisApi.list(query);
      if (currentRequest !== requestId.current) return;
      setRows(result.items);
      setTotal(result.total);
    } catch {
      if (currentRequest !== requestId.current) return;
      message.error("加载半成品欠料分析表失败");
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canOpen) return;
    void load(DEFAULT_SHORTAGE_QUERY);
    return () => { requestId.current += 1; };
  }, [canOpen, load]);

  const invalidateResults = (nextField: SemiFinishedShortageField, nextKeyword: string) => {
    requestId.current += 1;
    setLoading(false);
    setRows([]);
    setTotal(0);
    setActiveQuery(normalizeShortageQuery({
      field: nextField,
      keyword: nextKeyword,
      exact: false,
      page: 1,
      pageSize: activeQuery.pageSize,
    }));
  };

  const changeField = (nextField: SemiFinishedShortageField) => {
    setField(nextField);
    invalidateResults(nextField, keyword);
  };

  const changeKeyword = (nextKeyword: string) => {
    setKeyword(nextKeyword);
    invalidateResults(field, nextKeyword);
  };

  const runQuery = (exact: boolean) => {
    const next = normalizeShortageQuery({ field, keyword, exact, page: 1, pageSize: activeQuery.pageSize });
    setActiveQuery(next);
    void load(next);
  };

  const changePage = (page: number, pageSize: number) => {
    if (loading) return;
    const next = normalizeShortageQuery({ ...activeQuery, page, pageSize });
    setActiveQuery(next);
    void load(next);
  };

  const exportReport = async () => {
    if (!canPrint || loading || total === 0) return;
    try {
      downloadShortageExport(await semiFinishedShortageAnalysisApi.export(activeQuery));
    } catch {
      message.error("导出半成品欠料分析表失败");
    }
  };

  const printReport = () => {
    if (!canPrint || loading || rows.length === 0) return;
    printTable(MENU, exportColumns, rows as unknown as Record<string, unknown>[]);
  };

  const columns = useMemo<ColumnsType<SemiFinishedShortageRow>>(() => [
    { title: "客户", dataIndex: "customer", width: 150 },
    { title: "产品货号", dataIndex: "productCode", width: 160 },
    { title: "产品名称", dataIndex: "productName", width: 220 },
    { title: "配件编号", dataIndex: "partCode", width: 150 },
    { title: "产品装配名称", dataIndex: "assemblyName", width: 240 },
    { title: "单位", dataIndex: "unit", width: 90 },
    quantityColumn("需求数量", "requiredQuantity"),
    quantityColumn("库存数量", "inventoryQuantity"),
    quantityColumn("欠料数量", "shortageQuantity", "#cf1322"),
  ], []);

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“半成品欠料分析表·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card
      title="半成品欠料分析表"
      variant="borderless"
      extra={(
        <Space wrap>
          <Tag color="blue">记录 {total}</Tag>
          <Button icon={<SettingOutlined />} disabled>表格设置</Button>
          <Button icon={<ExportOutlined />} disabled={!canPrint || loading || total === 0} onClick={() => void exportReport()}>导出EXCEL</Button>
          <Button
            icon={<PrinterOutlined />}
            disabled={!canPrint || loading || rows.length === 0}
            onClick={printReport}
          >打印</Button>
          <Button
            danger
            icon={<CloseOutlined />}
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
          >关闭</Button>
        </Space>
      )}
    >
      <Space style={{ marginBottom: 16 }} wrap>
        <span>请选择条件：</span>
        <Select<SemiFinishedShortageField>
          aria-label="查询字段"
          value={field}
          options={fieldOptions}
          onChange={changeField}
          style={{ width: 150 }}
        />
        <Input
          aria-label="查询关键字"
          allowClear
          value={keyword}
          placeholder={`请输入${fieldOptions.find(option => option.value === field)?.label ?? "查询内容"}`}
          onChange={event => changeKeyword(event.target.value)}
          onPressEnter={() => runQuery(false)}
          style={{ width: 280 }}
        />
        <Button icon={<SearchOutlined />} onClick={() => runQuery(false)}>查询</Button>
        <Button icon={<SearchOutlined />} onClick={() => runQuery(true)}>精确查询</Button>
      </Space>

      <Table<SemiFinishedShortageRow>
        rowKey={(row, index) => JSON.stringify([
          row.customer,
          row.productCode,
          row.productName,
          row.partCode,
          row.assemblyName,
          row.unit,
          row.requiredQuantity,
          row.inventoryQuantity,
          row.shortageQuantity,
          index ?? 0,
        ])}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1450, y: "calc(100vh - 300px)" }}
        locale={{ emptyText: "暂无欠料数据" }}
        pagination={{
          current: activeQuery.page,
          pageSize: activeQuery.pageSize,
          total,
          showSizeChanger: true,
          showTotal: count => `共 ${count} 条`,
          onChange: changePage,
        }}
      />
    </Card>
  );
}
