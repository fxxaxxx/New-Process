import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, DatePicker, Input, Modal, Select, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  auxiliaryStocktakeQueryApi,
  type AuxiliaryStocktakeDetailRow,
  type AuxiliaryStocktakeSummaryRow,
} from "../../api/auxiliaryStocktakeQuery";
import { materialMasterApi, type MaterialCategoryNode } from "../../api/materialMaster";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryStocktakeQuery,
  type AuxiliaryStocktakeAudit,
} from "../../utils/auxiliaryStocktakeQuery";
import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
} from "./AuxiliaryReportLayout";
import AuxiliaryStocktakeQueryDetailDrawer from "./AuxiliaryStocktakeQueryDetailDrawer";

const MENU = "辅料盘点查询";

type TabKey = "summary" | "detail";
type SearchField = "辅料编号" | "辅料名称" | "规格" | "单号";
type DateType = "日期";

const auditOptions = ["全部", "已审核", "未审核"].map(value => ({ value, label: value }));
const summarySearchFields: SearchField[] = ["辅料编号", "辅料名称", "规格"];
const detailSearchFields: SearchField[] = [...summarySearchFields, "单号"];
const searchFieldDataIndex: Record<SearchField, "物料编号" | "物料名称" | "规格" | "单号"> = {
  辅料编号: "物料编号",
  辅料名称: "物料名称",
  规格: "规格",
  单号: "单号",
};

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

const fmtNumber = (value?: number | null) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export default function AuxiliaryStocktakeQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [tab, setTab] = useState<TabKey>("summary");
  const [dateType, setDateType] = useState<DateType>("日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [categories, setCategories] = useState<MaterialCategoryNode[]>([]);
  const [category, setCategory] = useState("全部");
  const [audit, setAudit] = useState<AuxiliaryStocktakeAudit>("全部");
  const [searchField, setSearchField] = useState<SearchField>("辅料编号");
  const [keyword, setKeyword] = useState("");
  const [summaryRows, setSummaryRows] = useState<AuxiliaryStocktakeSummaryRow[]>([]);
  const [detailRows, setDetailRows] = useState<AuxiliaryStocktakeDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<string>();
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedDateType, setAdvancedDateType] = useState<DateType>("日期");
  const [advancedRange, setAdvancedRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [advancedCategory, setAdvancedCategory] = useState("全部");
  const [advancedAudit, setAdvancedAudit] = useState<AuxiliaryStocktakeAudit>("全部");
  const [advancedSearchField, setAdvancedSearchField] = useState<SearchField>("辅料编号");
  const [advancedKeyword, setAdvancedKeyword] = useState("");
  const [reloadVersion, setReloadVersion] = useState(0);
  const requestIdRef = useRef(0);

  const query = useMemo(() => buildAuxiliaryStocktakeQuery({
    start: range[0].format("YYYY-MM-DD"),
    end: range[1].format("YYYY-MM-DD"),
    keyword,
    category,
    audit,
  }), [audit, category, keyword, range]);

  const load = useCallback(async () => {
    if (!canOpen) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      if (tab === "summary") {
        const rows = await auxiliaryStocktakeQueryApi.summary(query);
        if (requestId === requestIdRef.current) setSummaryRows(rows);
      } else {
        const rows = await auxiliaryStocktakeQueryApi.detail(query);
        if (requestId === requestIdRef.current) setDetailRows(rows);
      }
    } catch {
      if (requestId === requestIdRef.current) message.error("加载辅料盘点查询失败");
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [canOpen, query, tab]);

  useEffect(() => { void load(); }, [load, reloadVersion]);

  useEffect(() => {
    materialMasterApi.categories().then(setCategories).catch(() => { /* 类别加载失败不阻塞查询 */ });
  }, []);

  useEffect(() => {
    if (tab === "summary" && searchField === "单号") setSearchField("辅料编号");
  }, [searchField, tab]);

  const jumpMonth = (offset: number) => {
    const month = dayjs().add(offset, "month");
    setRange([month.startOf("month"), month.endOf("month")]);
  };

  const openAdvancedQuery = () => {
    setAdvancedDateType(dateType);
    setAdvancedRange(range);
    setAdvancedCategory(category);
    setAdvancedAudit(audit);
    setAdvancedSearchField(searchField);
    setAdvancedKeyword(keyword);
    setAdvancedOpen(true);
  };

  const applyAdvancedQuery = () => {
    setDateType(advancedDateType);
    setRange(advancedRange);
    setCategory(advancedCategory);
    setAudit(advancedAudit);
    setSearchField(advancedSearchField);
    setKeyword(advancedKeyword);
    setAdvancedOpen(false);
    setReloadVersion(version => version + 1);
  };

  const categoryOptions = useMemo(() => [
    { value: "全部", label: "全部" },
    ...categories
      .filter(item => !!item.类别)
      .map(item => ({ value: item.类别!, label: `${item.类别}（${item.数量}）` })),
  ], [categories]);

  const searchFieldOptions = (tab === "summary" ? summarySearchFields : detailSearchFields)
    .map(value => ({ value, label: value }));
  const visibleSummary = useMemo(
    () => filterByField(summaryRows, searchField, keyword),
    [keyword, searchField, summaryRows],
  );
  const visibleDetail = useMemo(
    () => filterByField(detailRows, searchField, keyword),
    [detailRows, keyword, searchField],
  );

  const summaryColumns: ColumnsType<AuxiliaryStocktakeSummaryRow> = [
    { title: "辅料编号", dataIndex: "物料编号", width: 144, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料名称", dataIndex: "物料名称", width: 240 },
    { title: "规格", dataIndex: "规格", width: 160 },
    { title: "单位", dataIndex: "单位", width: 100 },
    { title: "系统数", dataIndex: "系统数量", width: 120, align: "right", render: fmtNumber },
    { title: "盘点数", dataIndex: "盘点数量", width: 120, align: "right", render: fmtNumber },
    { title: "盈亏数", dataIndex: "盈亏数量", width: 120, align: "right", render: fmtNumber },
  ];

  const detailColumns: ColumnsType<AuxiliaryStocktakeDetailRow> = [
    { title: "日期", dataIndex: "日期", width: 112 },
    { title: "单号", dataIndex: "单号", width: 144, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料编号", dataIndex: "物料编号", width: 144, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "辅料名称", dataIndex: "物料名称", width: 220 },
    { title: "规格", dataIndex: "规格", width: 160 },
    { title: "单位", dataIndex: "单位", width: 100 },
    { title: "系统数量", dataIndex: "系统数量", width: 120, align: "right", render: fmtNumber },
    { title: "盘点数量", dataIndex: "盘点数量", width: 120, align: "right", render: fmtNumber },
    { title: "盈亏数量", dataIndex: "盈亏数量", width: 120, align: "right", render: fmtNumber },
    { title: "备注", dataIndex: "备注", width: 180 },
    { title: "审核", dataIndex: "审核", width: 100, align: "center", render: (value?: string) => value === "1" ? "已审核" : "未审核" },
  ];

  const activeRows = tab === "summary" ? visibleSummary : visibleDetail;

  if (!canOpen) {
    return (
      <AuxiliaryReportLayout title="辅料盘点查询">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料盘点查询·打开”权限）。</div>
      </AuxiliaryReportLayout>
    );
  }

  return (
    <AuxiliaryReportLayout title="辅料盘点查询" recordCount={activeRows.length}>
      <div style={auxiliaryReportFilterPanelStyle}>
        <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
          <Button onClick={() => jumpMonth(-1)}>上月</Button>
          <Button onClick={() => jumpMonth(0)}>本月</Button>
          <Button onClick={() => jumpMonth(1)}>下月</Button>
          <span>日期类型</span>
          <Select<DateType>
            value={dateType}
            onChange={setDateType}
            style={{ width: 96 }}
            options={[{ value: "日期", label: "日期" }]}
          />
          <span>日期范围</span>
          <DatePicker.RangePicker
            allowClear={false}
            value={range}
            format="YYYY/M/D"
            onChange={value => value?.[0] && value[1] && setRange([value[0], value[1]])}
          />
          <span>物料类别</span>
          <Select value={category} onChange={setCategory} style={{ width: 128 }} options={categoryOptions} />
          <span>审核情况</span>
          <Select<AuxiliaryStocktakeAudit>
            value={audit}
            onChange={setAudit}
            style={{ width: 112 }}
            options={auditOptions as { value: AuxiliaryStocktakeAudit; label: string }[]}
          />
        </Space>
        <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
          <span>查询字段</span>
          <Select<SearchField>
            value={searchField}
            onChange={setSearchField}
            style={{ width: 128 }}
            options={searchFieldOptions as { value: SearchField; label: string }[]}
          />
          <Input
            allowClear
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            onPressEnter={() => void load()}
            placeholder="关键词"
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={() => void load()}>查询</Button>
          <Button icon={<SearchOutlined />} onClick={() => void load()}>精确查询</Button>
          <Button icon={<SearchOutlined />} onClick={openAdvancedQuery}>高级查询</Button>
          {tab === "detail" ? <span>双击明细行查看盘点单</span> : null}
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
              <Table<AuxiliaryStocktakeSummaryRow>
                rowKey={summaryKey}
                size="small"
                loading={loading}
                dataSource={visibleSummary}
                columns={summaryColumns}
                pagination={false}
                scroll={{ x: 1004, y: 680 }}
              />
            ),
          },
          {
            key: "detail",
            label: "明细查询",
            children: (
              <Table<AuxiliaryStocktakeDetailRow>
                rowKey={detailKey}
                size="small"
                loading={loading}
                dataSource={visibleDetail}
                columns={detailColumns}
                pagination={false}
                scroll={{ x: 1640, y: 680 }}
                onRow={row => ({
                  onDoubleClick: () => row.单号 && setViewing(row.单号),
                  style: { cursor: row.单号 ? "pointer" : "default" },
                })}
              />
            ),
          },
        ]}
      />
      <AuxiliaryStocktakeQueryDetailDrawer
        open={viewing !== undefined}
        单号={viewing}
        onClose={() => setViewing(undefined)}
      />
      <Modal
        title="高级查询"
        open={advancedOpen}
        onOk={applyAdvancedQuery}
        onCancel={() => setAdvancedOpen(false)}
        okText="查询"
        cancelText="取消"
        width={680}
      >
        <Space direction="vertical" size={16} style={{ display: "flex" }}>
          <Space wrap size={8}>
            <span>日期类型</span>
            <Select<DateType>
              value={advancedDateType}
              onChange={setAdvancedDateType}
              style={{ width: 112 }}
              options={[{ value: "日期", label: "日期" }]}
            />
            <DatePicker.RangePicker
              allowClear={false}
              value={advancedRange}
              format="YYYY/M/D"
              onChange={value => value?.[0] && value[1] && setAdvancedRange([value[0], value[1]])}
            />
          </Space>
          <Space wrap size={8}>
            <span>物料类别</span>
            <Select
              value={advancedCategory}
              onChange={setAdvancedCategory}
              style={{ width: 160 }}
              options={categoryOptions}
            />
            <span>审核情况</span>
            <Select<AuxiliaryStocktakeAudit>
              value={advancedAudit}
              onChange={setAdvancedAudit}
              style={{ width: 120 }}
              options={auditOptions as { value: AuxiliaryStocktakeAudit; label: string }[]}
            />
          </Space>
          <Space wrap size={8}>
            <span>查询字段</span>
            <Select<SearchField>
              value={advancedSearchField}
              onChange={setAdvancedSearchField}
              style={{ width: 140 }}
              options={searchFieldOptions as { value: SearchField; label: string }[]}
            />
            <Input
              allowClear
              value={advancedKeyword}
              onChange={event => setAdvancedKeyword(event.target.value)}
              onPressEnter={applyAdvancedQuery}
              placeholder="关键词"
              style={{ width: 260 }}
            />
          </Space>
        </Space>
      </Modal>
    </AuxiliaryReportLayout>
  );
}

function summaryKey(row: AuxiliaryStocktakeSummaryRow, index?: number) {
  return [row.物料编号 ?? "", row.规格 ?? "", index ?? 0].join("|");
}

function detailKey(row: AuxiliaryStocktakeDetailRow, index?: number) {
  return [row.单号 ?? "", row.物料编号 ?? "", row.规格 ?? "", index ?? 0].join("|");
}

function filterByField<T extends AuxiliaryStocktakeSummaryRow | AuxiliaryStocktakeDetailRow>(
  rows: T[],
  field: SearchField,
  keyword: string,
) {
  const trimmed = keyword.trim();
  if (!trimmed) return rows;

  const dataIndex = searchFieldDataIndex[field];

  return rows.filter(row => String((row as Record<string, unknown>)[dataIndex] ?? "").includes(trimmed));
}
