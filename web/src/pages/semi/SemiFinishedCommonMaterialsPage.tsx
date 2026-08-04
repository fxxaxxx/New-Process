import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Input, Select, Space, Table, Tag, message } from "antd";
import {
  CloseOutlined,
  ExportOutlined,
  PrinterOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { useNavigate } from "react-router-dom";
import {
  semiFinishedCommonMaterialsApi,
  type SemiFinishedCommonMaterialRow,
} from "../../api/semiFinishedCommonMaterials";
import {
  buildAssemblyMaterialDetailUrl,
  buildSemiFinishedCommonMaterialParams,
  createRequestVersionGuard,
  loadSemiFinishedCommonMaterialFilters,
  maskSemiFinishedCommonMaterialPrice,
  saveSemiFinishedCommonMaterialFilters,
  type SemiFinishedCommonMaterialFilterState,
} from "../../utils/semiFinishedCommonMaterials";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "半成品共用物料表";
const PAGE_SIZE = 50;

const fieldOptions = [
  "产品货号",
  "客户",
  "产品名称",
  "产品装配名称",
  "配件编号",
  "共用物料编号",
].map(value => ({ value, label: value }));

const duplicateOptions = ["全部", "显示重复"].map(value => ({ value, label: value }));
const pendingOptions = ["全部", "待设置", "已设置"].map(value => ({ value, label: value }));
const auditOptions = ["全部", "已审核", "未审核"].map(value => ({ value, label: value }));

function initialFilters(): SemiFinishedCommonMaterialFilterState {
  const stored = loadSemiFinishedCommonMaterialFilters();
  return {
    field: stored.field ?? stored.查询字段 ?? "产品货号",
    keyword: stored.keyword ?? "",
    exact: stored.exact ?? stored.精确 ?? false,
    duplicate: stored.duplicate ?? stored.重复内容 ?? "全部",
    pending: stored.pending ?? stored.待操作物料 ?? "全部",
    audit: stored.audit ?? stored.审核情况 ?? "全部",
    page: stored.page ?? 1,
    size: stored.size ?? PAGE_SIZE,
  };
}

export default function SemiFinishedCommonMaterialsPage() {
  const perms = usePerms();
  const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const canSeePrice = can(perms, MENU, "单价");
  const canPrint = can(perms, MENU, "打印");
  const [filters, setFilters] = useState<SemiFinishedCommonMaterialFilterState>(initialFilters);
  const [rows, setRows] = useState<SemiFinishedCommonMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();
  const requests = useRef(createRequestVersionGuard());

  const loadRows = useCallback(async (nextFilters: SemiFinishedCommonMaterialFilterState) => {
    if (!canOpen) return;
    const version = requests.current.next();
    setLoading(true);
    try {
      const result = await semiFinishedCommonMaterialsApi.list(
        buildSemiFinishedCommonMaterialParams(nextFilters),
      );
      if (!requests.current.isCurrent(version)) return;
      setRows(result.items);
      setTotal(result.total);
    } catch {
      if (requests.current.isCurrent(version)) message.error("加载半成品共用物料表失败");
    } finally {
      if (requests.current.isCurrent(version)) setLoading(false);
    }
  }, [canOpen]);

  useEffect(() => {
    if (canOpen) void loadRows(filters);
    return () => { requests.current.next(); };
  }, [canOpen, loadRows]);

  const updateFilter = <K extends keyof SemiFinishedCommonMaterialFilterState>(
    key: K,
    value: SemiFinishedCommonMaterialFilterState[K],
  ) => {
    setFilters(current => ({ ...current, [key]: value }));
  };

  const runQuery = (exact: boolean) => {
    const next = { ...filters, exact, page: 1 };
    setFilters(next);
    void loadRows(next);
  };

  const runContainsQuery = () => runQuery(false);
  const runExactQuery = () => runQuery(true);

  const changePage = (page: number, size = filters.size ?? PAGE_SIZE) => {
    const next = { ...filters, page, size };
    setFilters(next);
    void loadRows(next);
  };

  const columns = useMemo<ColumnsType<SemiFinishedCommonMaterialRow>>(() => [
    { title: "客户", dataIndex: "客户", width: 120 },
    { title: "产品货号", dataIndex: "产品货号", width: 140 },
    { title: "产品名称", dataIndex: "产品名称", width: 150 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
    {
      title: "库存单价",
      dataIndex: "库存单价",
      width: 110,
      align: "right",
      render: (value: number | null | undefined) => maskSemiFinishedCommonMaterialPrice(value, canSeePrice),
    },
    { title: "配件编号", dataIndex: "配件编号", width: 130 },
    { title: "共用物料编号", dataIndex: "共用物料编号", width: 150 },
    {
      title: "调整审核",
      dataIndex: "调整审核",
      width: 100,
      render: (value: SemiFinishedCommonMaterialRow["调整审核"]) => (
        <Tag color={value === "已审核" ? "success" : "warning"}>{value}</Tag>
      ),
    },
    { title: "备注内容", dataIndex: "备注内容", width: 220 },
  ], [canSeePrice]);

  const exportColumns = useMemo<ExportCol[]>(() => [
    { title: "客户", key: "客户" },
    { title: "产品货号", key: "产品货号" },
    { title: "产品名称", key: "产品名称" },
    { title: "产品装配名称", key: "产品装配名称" },
    {
      title: "库存单价",
      key: "库存单价",
      fmt: value => String(maskSemiFinishedCommonMaterialPrice(
        typeof value === "number" ? value : null,
        canSeePrice,
      )),
    },
    { title: "配件编号", key: "配件编号" },
    { title: "共用物料编号", key: "共用物料编号" },
    { title: "调整审核", key: "调整审核" },
    { title: "备注内容", key: "备注内容" },
  ], [canSeePrice]);

  const exportDisabled = !canPrint || loading || rows.length === 0;

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div>
      </Card>
    );
  }

  return (
    <Card title="半成品共用物料表" variant="borderless">
      <Space wrap style={{ width: "100%", marginBottom: 16 }}>
        <Select
          value={filters.field ?? "产品货号"}
          options={fieldOptions}
          onChange={value => updateFilter("field", value)}
          style={{ width: 150 }}
        />
        <Input.Search
          allowClear
          value={filters.keyword ?? ""}
          placeholder="请输入关键字"
          onChange={event => updateFilter("keyword", event.target.value)}
          onSearch={runContainsQuery}
          loading={loading}
          style={{ width: 220 }}
        />
        <Select
          value={filters.duplicate ?? "全部"}
          options={duplicateOptions}
          onChange={value => updateFilter("duplicate", value)}
          style={{ width: 120 }}
        />
        <Select
          value={filters.pending ?? "全部"}
          options={pendingOptions}
          onChange={value => updateFilter("pending", value)}
          style={{ width: 120 }}
        />
        <Select
          value={filters.audit ?? "全部"}
          options={auditOptions}
          onChange={value => updateFilter("audit", value)}
          style={{ width: 120 }}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          disabled={loading}
          onClick={runContainsQuery}
        >查询</Button>
        <Button disabled={loading} onClick={runExactQuery}>精确查询</Button>
      </Space>
      <Space wrap style={{ width: "100%", marginBottom: 16 }}>
        <Button icon={<TableOutlined />} disabled>表格设置</Button>
        <Button
          icon={<ExportOutlined />}
          disabled={exportDisabled}
          onClick={() => downloadCsv(
            "半成品共用物料表.csv",
            exportColumns,
            rows as unknown as Record<string, unknown>[],
          )}
        >导出EXCEL</Button>
        <Button
          icon={<PrinterOutlined />}
          disabled={exportDisabled}
          onClick={() => printTable(
            "半成品共用物料表",
            exportColumns,
            rows as unknown as Record<string, unknown>[],
          )}
        >打印</Button>
        <Button danger icon={<CloseOutlined />} onClick={() => navigate(-1)}>关闭</Button>
      </Space>
      <Table<SemiFinishedCommonMaterialRow>
        rowKey="产品货号"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 320px)" }}
        rowClassName={row => row.产品货号 === selectedKey ? "erp-row-selected" : ""}
        onRow={row => ({
          onClick: () => setSelectedKey(row.产品货号),
          onDoubleClick: () => {
            if (!row.产品货号) {
              message.warning("该记录缺少产品货号，无法打开详情");
              return;
            }
            saveSemiFinishedCommonMaterialFilters(filters);
            navigate(buildAssemblyMaterialDetailUrl(row.产品货号));
          },
        })}
        pagination={{
          current: filters.page ?? 1,
          pageSize: filters.size ?? PAGE_SIZE,
          total,
          showSizeChanger: false,
          showTotal: value => `共 ${value} 条`,
          onChange: changePage,
        }}
      />
    </Card>
  );
}
