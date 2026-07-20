import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Select, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  auxiliaryReceiptQueryApi,
  type AuxiliaryReceiptQueryDetailRow,
  type AuxiliaryReceiptQuerySummaryRow,
} from "../../api/auxiliaryReceiptQuery";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryReceiptQuery,
  normalizeAuxiliaryReceiptDetailRow,
  normalizeAuxiliaryReceiptSummaryRow,
  type AuxiliaryReceiptAuditStatus,
  type AuxiliaryReceiptDateMode,
} from "../../utils/auxiliaryReceiptQuery";
import MaterialDocDetailDrawer from "../materials/MaterialDocDetailDrawer";
import { MATERIAL_DOC_CONFIGS } from "../materials/materialDocConfigs";

import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
} from "./AuxiliaryReportLayout";

const MENU = "辅料入仓查询";
const RECEIPT_CFG = MATERIAL_DOC_CONFIGS["purchase-receipts"];

type TabKey = "summary" | "detail";
type SearchField = "辅料编号" | "辅料名称" | "规格" | "单号" | "入库单号" | "订单单号" | "供应商名称";

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];
const categoryOptions = [{ value: "<所有类别>", label: "<所有类别>" }];

const fmtNumber = (value?: number | null) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export default function AuxiliaryReceiptQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [tab, setTab] = useState<TabKey>("summary");
  const [dateMode, setDateMode] = useState<AuxiliaryReceiptDateMode>("日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [category, setCategory] = useState("<所有类别>");
  const [searchField, setSearchField] = useState<SearchField>("辅料编号");
  const [keyword, setKeyword] = useState("");
  const [exact, setExact] = useState(false);
  const [groupBySupplier, setGroupBySupplier] = useState(false);
  const [auditStatus, setAuditStatus] = useState<AuxiliaryReceiptAuditStatus>("全部");
  const [summaryRows, setSummaryRows] = useState<AuxiliaryReceiptQuerySummaryRow[]>([]);
  const [detailRows, setDetailRows] = useState<AuxiliaryReceiptQueryDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [viewReceiptNo, setViewReceiptNo] = useState<string | null>(null);

  const query = useMemo(() => buildAuxiliaryReceiptQuery({
    dateMode,
    startDate: range[0].format("YYYY-MM-DD"),
    endDate: range[1].format("YYYY-MM-DD"),
    keyword,
    category,
    groupBySupplier,
    auditStatus,
  }), [auditStatus, category, dateMode, groupBySupplier, keyword, range]);

  const load = useCallback(async (exactMode = false) => {
    if (!canOpen) return;
    setExact(exactMode);
    setLoading(true);
    try {
      if (tab === "summary") {
        const result = await auxiliaryReceiptQueryApi.summary(query);
        const mapped = result.map(normalizeAuxiliaryReceiptSummaryRow);
        setSummaryRows(mapped);
        setSelectedKey(mapped[0] ? summaryKey(mapped[0], 0) : undefined);
      } else {
        const result = await auxiliaryReceiptQueryApi.detail(query);
        const mapped = result.map(normalizeAuxiliaryReceiptDetailRow);
        setDetailRows(mapped);
        setSelectedKey(mapped[0] ? detailKey(mapped[0], 0) : undefined);
      }
    } catch {
      message.error("加载辅料入仓查询失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, query, tab]);

  useEffect(() => { load(false); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const visibleSummary = useMemo(() => {
    const kw = keyword.trim();
    if (!kw) return summaryRows;
    return summaryRows.filter(row => matchesField(row, searchField, kw, exact));
  }, [exact, keyword, searchField, summaryRows]);

  const visibleDetail = useMemo(() => {
    const kw = keyword.trim();
    if (!kw) return detailRows;
    return detailRows.filter(row => matchesField(row, searchField, kw, exact));
  }, [detailRows, exact, keyword, searchField]);

  const supplierColumns: ColumnsType<AuxiliaryReceiptQuerySummaryRow> = groupBySupplier ? [
    { title: "供应商编号", dataIndex: "供应商编号", width: 128 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 210 },
  ] : [];

  const summaryColumns: ColumnsType<AuxiliaryReceiptQuerySummaryRow> = [
    {
      title: "",
      key: "selector",
      width: 34,
      fixed: "left",
      render: (_, row, index) => (summaryKey(row, index) === selectedKey ? "▶" : ""),
    },
    ...supplierColumns,
    { title: "辅料编号", dataIndex: "辅料编号", width: 134, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料名称", dataIndex: "辅料名称", width: 318 },
    { title: "规格", dataIndex: "规格", width: 118 },
    { title: "单位", dataIndex: "单位", width: 118 },
    { title: "入仓数量", dataIndex: "入仓数量", width: 122, align: "right", render: fmtNumber },
  ];

  const detailColumns: ColumnsType<AuxiliaryReceiptQueryDetailRow> = [
    {
      title: "",
      key: "selector",
      width: 34,
      fixed: "left",
      render: (_, row, index) => (detailKey(row, index) === selectedKey ? "▶" : ""),
    },
    { title: "日期", dataIndex: "日期", width: 100 },
    { title: "单号", dataIndex: "单号", width: 110, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "入库单号", dataIndex: "入库单号", width: 110, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "订单单号", dataIndex: "订单单号", width: 110, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "供应商编号", dataIndex: "供应商编号", width: 92 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 136 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 102, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料名称", dataIndex: "辅料名称", width: 200 },
    { title: "规格", dataIndex: "规格", width: 92 },
    { title: "单价类型", dataIndex: "单价类型", width: 104 },
    { title: "单位", dataIndex: "单位", width: 92 },
    { title: "数量", dataIndex: "数量", width: 92, align: "right", render: fmtNumber },
    { title: "备注", dataIndex: "备注", width: 116 },
    { title: "审核", dataIndex: "审核", width: 88, align: "center", render: (value?: string) => value === "1" ? "已审核" : "未审核" },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料入仓查询·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <AuxiliaryReportLayout
      title="辅料入仓查询"
      recordCount={tab === "summary" ? visibleSummary.length : visibleDetail.length}
    >
      <div style={auxiliaryReportFilterPanelStyle}>
        <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
          <Button onClick={() => jumpMonth(-1)}>上月</Button>
          <Button onClick={() => jumpMonth(0)}>本月</Button>
          <Button onClick={() => jumpMonth(1)}>下月</Button>
          <span>物料类别</span>
          <Select value={category} onChange={setCategory} style={{ width: 208 }} options={categoryOptions} />
          {tab === "summary" ? (
            <Checkbox checked={groupBySupplier} onChange={e => setGroupBySupplier(e.target.checked)}>
              汇总查询: 按供应商
            </Checkbox>
          ) : (
            <span>提示：双击明细单可打开单据</span>
          )}
          {tab === "detail" ? (
            <Space size={8}>
              <span>审核情况：</span>
              <Select<AuxiliaryReceiptAuditStatus>
                value={auditStatus}
                onChange={setAuditStatus}
                style={{ width: 112 }}
                options={["全部", "已审核", "未审核"].map(value => ({ value: value as AuxiliaryReceiptAuditStatus, label: value }))}
              />
            </Space>
          ) : null}
        </Space>
        <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
          <span>日期</span>
          <Select<AuxiliaryReceiptDateMode>
            value={dateMode}
            onChange={setDateMode}
            style={{ width: 112 }}
            options={["日期", "不选择日期"].map(value => ({ value: value as AuxiliaryReceiptDateMode, label: value }))}
          />
          <DatePicker
            allowClear={false}
            value={range[0]}
            format="YYYY/M/D"
            onChange={value => value && setRange([value, range[1]])}
            style={{ width: 112 }}
          />
          <span>至</span>
          <DatePicker
            allowClear={false}
            value={range[1]}
            format="YYYY/M/D"
            onChange={value => value && setRange([range[0], value])}
            style={{ width: 112 }}
          />
          <span>请选择条件：</span>
          <Select<SearchField>
            value={searchField}
            onChange={setSearchField}
            style={{ width: 116 }}
            options={["辅料编号", "辅料名称", "规格", "单号", "入库单号", "订单单号", "供应商名称"].map(value => ({ value: value as SearchField, label: value }))}
          />
          <span>查询</span>
          <Input
            allowClear
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onPressEnter={() => load(false)}
            style={{ width: 204 }}
          />
          <Button icon={<SearchOutlined />} onClick={() => load(false)}>查询</Button>
          <Button icon={<SearchOutlined />} onClick={() => load(true)}>精确查询</Button>
          <Button icon={<SearchOutlined />} onClick={() => load(false)}>高级查询</Button>
        </Space>
      </div>

      <Tabs
        activeKey={tab}
        onChange={key => setTab(key as TabKey)}
        items={[
          {
            key: "summary",
            label: "汇总查询",
            children: (
              <Table<AuxiliaryReceiptQuerySummaryRow>
                rowKey={summaryKey}
                size="small"
                loading={loading}
                dataSource={visibleSummary}
                columns={summaryColumns}
                pagination={false}
                locale={{ emptyText: "" }}
                scroll={{ x: Math.max(850, groupBySupplier ? 1190 : 850), y: 680 }}
                onRow={(row, index) => ({
                  onClick: () => setSelectedKey(summaryKey(row, index ?? 0)),
                  style: {
                    cursor: "default",
                    fontFamily: "Consolas, 'Microsoft YaHei', sans-serif",
                  },
                })}
              />
            ),
          },
          {
            key: "detail",
            label: "明细查询",
            children: (
              <Table<AuxiliaryReceiptQueryDetailRow>
                rowKey={detailKey}
                size="small"
                loading={loading}
                dataSource={visibleDetail}
                columns={detailColumns}
                pagination={false}
                locale={{ emptyText: "" }}
                scroll={{ x: 1490, y: 680 }}
                onRow={(row, index) => ({
                  onClick: () => setSelectedKey(detailKey(row, index ?? 0)),
                  onDoubleClick: () => row.入库单号 && setViewReceiptNo(row.入库单号),
                  style: {
                    cursor: row.入库单号 ? "pointer" : "default",
                    fontFamily: "Consolas, 'Microsoft YaHei', sans-serif",
                  },
                })}
              />
            ),
          },
        ]}
      />
      <MaterialDocDetailDrawer
        cfg={RECEIPT_CFG}
        单号={viewReceiptNo}
        onClose={() => setViewReceiptNo(null)}
      />
    </AuxiliaryReportLayout>
  );
}

function matchesField(row: object, field: SearchField, keyword: string, exact: boolean) {
  const record = row as Record<string, unknown>;
  if (!(field in record)) return true;
  const value = String(record[field] ?? "");
  return exact ? value === keyword : value.includes(keyword);
}

function summaryKey(row: AuxiliaryReceiptQuerySummaryRow, index?: number) {
  return [
    row.供应商编号 ?? "",
    row.辅料编号 ?? "",
    row.规格 ?? "",
    index ?? 0,
  ].join("|");
}

function detailKey(row: AuxiliaryReceiptQueryDetailRow, index?: number) {
  return [
    row.入库单号 ?? "",
    row.单号 ?? "",
    row.辅料编号 ?? "",
    row.规格 ?? "",
    index ?? 0,
  ].join("|");
}
