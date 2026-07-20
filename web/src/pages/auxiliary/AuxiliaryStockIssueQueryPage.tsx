import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Select, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  auxiliaryStockIssueQueryApi,
  type AuxiliaryStockIssueQueryDetailRow,
  type AuxiliaryStockIssueQuerySummaryRow,
} from "../../api/auxiliaryStockIssueQuery";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryStockIssueQuery,
  normalizeAuxiliaryStockIssueDetailRow,
  normalizeAuxiliaryStockIssueSummaryRow,
  type AuxiliaryStockIssueAuditStatus,
  type AuxiliaryStockIssueDateMode,
} from "../../utils/auxiliaryStockIssueQuery";
import MaterialDocDetailDrawer from "../materials/MaterialDocDetailDrawer";
import { MATERIAL_DOC_CONFIGS } from "../materials/materialDocConfigs";

import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
} from "./AuxiliaryReportLayout";

const MENU = "辅料出库查询";
const ISSUE_CFG = MATERIAL_DOC_CONFIGS["material-issues"];

type TabKey = "summary" | "detail";
type SearchField = "辅料编号" | "辅料名称" | "规格" | "单号" | "装配生产单号" | "领料备注" | "领料人";
type IssueRemark = "全部" | "生产领料" | "补料" | "样板领料" | "维修领料" | "其他";

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];
const categoryOptions = [{ value: "<所有类别>", label: "<所有类别>" }];

const fmtNumber = (value?: number | null) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export default function AuxiliaryStockIssueQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [tab, setTab] = useState<TabKey>("summary");
  const [dateMode, setDateMode] = useState<AuxiliaryStockIssueDateMode>("日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [category, setCategory] = useState("<所有类别>");
  const [issueRemark, setIssueRemark] = useState<IssueRemark>("全部");
  const [maker, setMaker] = useState("");
  const [auditStatus, setAuditStatus] = useState<AuxiliaryStockIssueAuditStatus>("全部");
  const [searchField, setSearchField] = useState<SearchField>("辅料编号");
  const [keyword, setKeyword] = useState("");
  const [exact, setExact] = useState(false);
  const [summaryRows, setSummaryRows] = useState<AuxiliaryStockIssueQuerySummaryRow[]>([]);
  const [detailRows, setDetailRows] = useState<AuxiliaryStockIssueQueryDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();
  const [viewIssueNo, setViewIssueNo] = useState<string | null>(null);

  const query = useMemo(() => buildAuxiliaryStockIssueQuery({
    dateMode,
    startDate: range[0].format("YYYY-MM-DD"),
    endDate: range[1].format("YYYY-MM-DD"),
    keyword,
    category,
    issueRemark,
    maker,
    auditStatus,
  }), [auditStatus, category, dateMode, issueRemark, keyword, maker, range]);

  const load = useCallback(async (exactMode = false) => {
    if (!canOpen) return;
    setExact(exactMode);
    setLoading(true);
    try {
      if (tab === "summary") {
        const result = await auxiliaryStockIssueQueryApi.summary(query);
        const mapped = result.map(normalizeAuxiliaryStockIssueSummaryRow);
        setSummaryRows(mapped);
        setSelectedKey(mapped[0] ? summaryKey(mapped[0], 0) : undefined);
      } else {
        const result = await auxiliaryStockIssueQueryApi.detail(query);
        const mapped = result.map(normalizeAuxiliaryStockIssueDetailRow);
        setDetailRows(mapped);
        setSelectedKey(mapped[0] ? detailKey(mapped[0], 0) : undefined);
      }
    } catch {
      message.error("加载辅料出库查询失败");
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

  const summaryColumns: ColumnsType<AuxiliaryStockIssueQuerySummaryRow> = [
    {
      title: "",
      key: "selector",
      width: 34,
      fixed: "left",
      render: (_, row, index) => (summaryKey(row, index) === selectedKey ? "▶" : ""),
    },
    { title: "领料备注", dataIndex: "领料备注", width: 132 },
    { title: "开单日期", dataIndex: "开单日期", width: 134 },
    { title: "装配生产单号", dataIndex: "装配生产单号", width: 184, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料编号", dataIndex: "辅料编号", width: 140, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料名称", dataIndex: "辅料名称", width: 250 },
    { title: "规格", dataIndex: "规格", width: 124 },
    { title: "单位", dataIndex: "单位", width: 124 },
    { title: "领料数量", dataIndex: "领料数量", width: 124, align: "right", render: fmtNumber },
    { title: "备注", dataIndex: "备注", width: 250 },
  ];

  const detailColumns: ColumnsType<AuxiliaryStockIssueQueryDetailRow> = [
    {
      title: "",
      key: "selector",
      width: 34,
      fixed: "left",
      render: (_, row, index) => (detailKey(row, index) === selectedKey ? "▶" : ""),
    },
    { title: "领料备注", dataIndex: "领料备注", width: 108 },
    { title: "开单日期", dataIndex: "开单日期", width: 104 },
    { title: "装配生产单号", dataIndex: "装配生产单号", width: 146, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "日期", dataIndex: "日期", width: 100 },
    { title: "审核日期", dataIndex: "审核日期", width: 100 },
    { title: "单号", dataIndex: "单号", width: 110, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "生产车间", dataIndex: "生产车间", width: 200 },
    { title: "领料人", dataIndex: "领料人", width: 90 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 104, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料名称", dataIndex: "辅料名称", width: 184 },
    { title: "规格", dataIndex: "规格", width: 104 },
    { title: "单位", dataIndex: "单位", width: 92 },
    { title: "数量", dataIndex: "数量", width: 92, align: "right", render: fmtNumber },
    { title: "备注", dataIndex: "备注", width: 110 },
    { title: "制单人", dataIndex: "制单人", width: 84 },
    { title: "审核", dataIndex: "审核", width: 88, align: "center", render: (value?: string) => value === "1" ? "已审核" : "未审核" },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料出库查询·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <AuxiliaryReportLayout
      title="辅料出库查询"
      recordCount={tab === "summary" ? visibleSummary.length : visibleDetail.length}
    >
      <div style={auxiliaryReportFilterPanelStyle}>
        <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
          <Button onClick={() => jumpMonth(-1)}>上月</Button>
          <Button onClick={() => jumpMonth(0)}>本月</Button>
          <Button onClick={() => jumpMonth(1)}>下月</Button>
          <span>物料类别</span>
          <Select value={category} onChange={setCategory} style={{ width: 208 }} options={categoryOptions} />
          <Checkbox checked onChange={() => undefined}>汇总查询: 按领料备注</Checkbox>
          {tab === "detail" ? <span>提示：双击明细单可打开单据</span> : null}
          <span>领料备注：</span>
          <Select<IssueRemark>
            value={issueRemark}
            onChange={setIssueRemark}
            style={{ width: 112 }}
            options={["全部", "生产领料", "补料", "样板领料", "维修领料", "其他"].map(value => ({
              value: value as IssueRemark,
              label: value === "全部" ? "<全部>" : value,
            }))}
          />
          {tab === "detail" ? (
            <>
              <span>制单人：</span>
              <Input value={maker} onChange={e => setMaker(e.target.value)} style={{ width: 108 }} />
              <span>审核情况：</span>
              <Select<AuxiliaryStockIssueAuditStatus>
                value={auditStatus}
                onChange={setAuditStatus}
                style={{ width: 112 }}
                options={["全部", "已审核", "未审核"].map(value => ({ value: value as AuxiliaryStockIssueAuditStatus, label: value }))}
              />
            </>
          ) : null}
        </Space>
        <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
          <span>日期</span>
          <Select<AuxiliaryStockIssueDateMode>
            value={dateMode}
            onChange={setDateMode}
            style={{ width: 112 }}
            options={["日期", "不选择日期"].map(value => ({ value: value as AuxiliaryStockIssueDateMode, label: value }))}
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
            style={{ width: 128 }}
            options={["辅料编号", "辅料名称", "规格", "单号", "装配生产单号", "领料备注", "领料人"].map(value => ({ value: value as SearchField, label: value }))}
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
              <Table<AuxiliaryStockIssueQuerySummaryRow>
                rowKey={summaryKey}
                size="small"
                loading={loading}
                dataSource={visibleSummary}
                columns={summaryColumns}
                pagination={false}
                locale={{ emptyText: "" }}
                scroll={{ x: 1466, y: 680 }}
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
              <Table<AuxiliaryStockIssueQueryDetailRow>
                rowKey={detailKey}
                size="small"
                loading={loading}
                dataSource={visibleDetail}
                columns={detailColumns}
                pagination={false}
                locale={{ emptyText: "" }}
                scroll={{ x: 1840, y: 680 }}
                onRow={(row, index) => ({
                  onClick: () => setSelectedKey(detailKey(row, index ?? 0)),
                  onDoubleClick: () => row.单号 && setViewIssueNo(row.单号),
                  style: {
                    cursor: row.单号 ? "pointer" : "default",
                    fontFamily: "Consolas, 'Microsoft YaHei', sans-serif",
                  },
                })}
              />
            ),
          },
        ]}
      />
      <MaterialDocDetailDrawer
        cfg={ISSUE_CFG}
        单号={viewIssueNo}
        onClose={() => setViewIssueNo(null)}
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

function summaryKey(row: AuxiliaryStockIssueQuerySummaryRow, index?: number) {
  return [
    row.领料备注 ?? "",
    row.开单日期 ?? "",
    row.装配生产单号 ?? "",
    row.辅料编号 ?? "",
    row.规格 ?? "",
    index ?? 0,
  ].join("|");
}

function detailKey(row: AuxiliaryStockIssueQueryDetailRow, index?: number) {
  return [
    row.单号 ?? "",
    row.装配生产单号 ?? "",
    row.辅料编号 ?? "",
    row.规格 ?? "",
    index ?? 0,
  ].join("|");
}
