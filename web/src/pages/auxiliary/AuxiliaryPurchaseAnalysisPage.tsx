import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CloseOutlined, ExportOutlined, PrinterOutlined, SearchOutlined, SettingOutlined,
} from "@ant-design/icons";
import {
  auxiliaryPurchaseAnalysisApi,
  type AuxiliaryPurchaseAnalysisRow,
} from "../../api/auxiliaryPurchaseAnalysis";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";
import {
  AUXILIARY_PURCHASE_DEFAULT_CATEGORY,
  buildAuxiliaryPurchaseAnalysisQuery,
  normalizeAuxiliaryPurchaseRow,
} from "../../utils/auxiliaryPurchaseAnalysis";

const MENU = "物料资料";

type SearchField = "辅料名称" | "辅料编号" | "规格" | "供应商";

const exportCols: ExportCol[] = [
  { title: "辅料编号", key: "辅料编号" },
  { title: "辅料名称", key: "辅料名称" },
  { title: "规格", key: "规格" },
  { title: "单位", key: "单位" },
  { title: "库存数量", key: "库存数量" },
  { title: "在途数量", key: "在途数量" },
  { title: "需领数量", key: "需领数量" },
  { title: "可用库存", key: "可用库存" },
  { title: "订货数量", key: "订货数量" },
  { title: "供应商", key: "供应商" },
];

const fmtNum = (v?: number | null) => Number(v ?? 0).toLocaleString("zh-CN", { maximumFractionDigits: 4 });

export default function AuxiliaryPurchaseAnalysisPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [keyword, setKeyword] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("辅料名称");
  const [onlyBuy, setOnlyBuy] = useState(true);
  const [rows, setRows] = useState<AuxiliaryPurchaseAnalysisRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const data = await auxiliaryPurchaseAnalysisApi.list(buildAuxiliaryPurchaseAnalysisQuery({
        category: AUXILIARY_PURCHASE_DEFAULT_CATEGORY,
        keyword,
        onlyBuy,
      }));
      setRows(data.map(normalizeAuxiliaryPurchaseRow));
    } catch {
      message.error("加载辅料采购分析表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, keyword, onlyBuy]);

  useEffect(() => { load(); }, [canOpen, onlyBuy]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnsType<AuxiliaryPurchaseAnalysisRow> = [
    { title: "辅料编号", dataIndex: "辅料编号", width: 130 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 240 },
    { title: "规格", dataIndex: "规格", width: 130 },
    { title: "单位", dataIndex: "单位", width: 80 },
    { title: "库存数量", dataIndex: "库存数量", width: 110, align: "right", render: fmtNum },
    { title: "在途数量", dataIndex: "在途数量", width: 110, align: "right", render: fmtNum },
    { title: "需领数量", dataIndex: "需领数量", width: 110, align: "right", render: fmtNum },
    { title: "可用库存", dataIndex: "可用库存", width: 110, align: "right", render: (v?: number | null) => (
      <span style={{ color: Number(v ?? 0) < 0 ? "#cf1322" : undefined }}>{fmtNum(v)}</span>
    ) },
    { title: "订货数量", dataIndex: "订货数量", width: 110, align: "right", render: (v?: number | null) => (
      <span style={{ color: Number(v ?? 0) > 0 ? "#cf1322" : undefined }}>{fmtNum(v)}</span>
    ) },
    { title: "供应商", dataIndex: "供应商", width: 260 },
  ];

  const searchPlaceholder = useMemo(() => `按${searchField}查询`, [searchField]);
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"物料资料·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="辅料采购分析表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <span style={{ color: "#1677ff", fontWeight: 600 }}>共查询到记录数：{rows.length}</span>
        <Checkbox checked={onlyBuy} onChange={e => setOnlyBuy(e.target.checked)}>
          只显示要订货的辅料资料
        </Checkbox>
      </Space>

      <Space style={{ marginBottom: 12 }} wrap>
        <span>请选择条件：</span>
        <Select<SearchField>
          value={searchField}
          onChange={setSearchField}
          style={{ width: 130 }}
          options={[
            { value: "辅料名称", label: "辅料名称" },
            { value: "辅料编号", label: "辅料编号" },
            { value: "规格", label: "规格" },
            { value: "供应商", label: "供应商" },
          ]}
        />
        <Input.Search
          allowClear
          placeholder={searchPlaceholder}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onSearch={load}
          style={{ width: 280 }}
        />
        <Button icon={<SearchOutlined />} onClick={load}>查询</Button>
        <Button icon={<SearchOutlined />} onClick={load}>精确查询</Button>
        <Button icon={<SettingOutlined />} disabled>表格设置</Button>
        <Button icon={<ExportOutlined />} onClick={() => downloadCsv("辅料采购分析表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button icon={<PrinterOutlined />} onClick={() => printTable("辅料采购分析表", exportCols, asRecords())}>打印</Button>
        <Button danger icon={<CloseOutlined />} onClick={() => window.history.back()}>关闭</Button>
      </Space>

      <Table
        rowKey={r => r.辅料编号 ?? `${r.辅料名称}-${r.规格}`}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: 1400, y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
      />
    </Card>
  );
}
