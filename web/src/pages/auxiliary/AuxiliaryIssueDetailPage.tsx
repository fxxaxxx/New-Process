import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  auxiliaryIssueDetailApi,
  type AuxiliaryIssueDetailRow,
} from "../../api/auxiliaryIssueDetail";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryIssueDetailQuery,
  getAuxiliaryIssueDetailTextColor,
  normalizeAuxiliaryIssueDetailRow,
  type AuxiliaryIssueDetailArrivalStatus,
  type AuxiliaryIssueDetailDateMode,
} from "../../utils/auxiliaryIssueDetail";

import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
  auxiliaryReportTableContainerStyle,
} from "./AuxiliaryReportLayout";

const MENU = "辅料出库明细表";

type SearchField = "装配生产单号" | "辅料编号" | "辅料名称" | "领料备注" | "领料单号";
type IssueRemark = "全部" | "生产领料" | "样品领料" | "维修领料";

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtNumber = (value?: number | null) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export default function AuxiliaryIssueDetailPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [arrivalStatus, setArrivalStatus] = useState<AuxiliaryIssueDetailArrivalStatus>("未到");
  const [dateMode, setDateMode] = useState<AuxiliaryIssueDetailDateMode>("不选择日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [issueRemark, setIssueRemark] = useState<IssueRemark>("全部");
  const [searchField, setSearchField] = useState<SearchField>("装配生产单号");
  const [keyword, setKeyword] = useState("");
  const [exact, setExact] = useState(false);
  const [rows, setRows] = useState<AuxiliaryIssueDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();

  const load = useCallback(async (exactMode = false) => {
    if (!canOpen) return;
    setExact(exactMode);
    setLoading(true);
    try {
      const query = buildAuxiliaryIssueDetailQuery({
        arrivalStatus,
        dateMode,
        startDate: range[0].format("YYYY-MM-DD"),
        endDate: range[1].format("YYYY-MM-DD"),
        keyword,
        issueRemark,
      });
      const result = await auxiliaryIssueDetailApi.list(query);
      const mapped = result.map(normalizeAuxiliaryIssueDetailRow);
      setRows(mapped);
      setSelectedKey(mapped[0] ? rowKey(mapped[0], 0) : undefined);
    } catch {
      message.error("加载辅料出库明细表失败");
    } finally {
      setLoading(false);
    }
  }, [arrivalStatus, canOpen, dateMode, issueRemark, keyword, range]);

  useEffect(() => { load(false); }, [load]);

  const displayRows = useMemo(() => {
    const kw = keyword.trim();
    if (!kw) return rows;
    return rows.filter(row => {
      const value = String(row[searchField] ?? "");
      return exact ? value === kw : value.includes(kw);
    });
  }, [exact, keyword, rows, searchField]);

  const columns: ColumnsType<AuxiliaryIssueDetailRow> = [
    {
      title: "",
      key: "selector",
      width: 34,
      fixed: "left",
      render: (_, row, index) => (rowKey(row, index) === selectedKey ? "▶" : ""),
    },
    { title: "开单日期", dataIndex: "开单日期", width: 110 },
    { title: "装配生产单号", dataIndex: "装配生产单号", width: 158, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "领料备注", dataIndex: "领料备注", width: 120 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 118 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 210 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "单位", dataIndex: "单位", width: 72 },
    { title: "需求数量", dataIndex: "需求数量", width: 110, align: "right", render: fmtNumber },
    { title: "领料日期", dataIndex: "领料日期", width: 112 },
    { title: "领料单号", dataIndex: "领料单号", width: 130 },
    { title: "领料数量", dataIndex: "领料数量", width: 110, align: "right", render: fmtNumber },
    { title: "合计已领数量", dataIndex: "合计已领数量", width: 132, align: "right", render: fmtNumber },
    { title: "未领数量", dataIndex: "未领数量", width: 110, align: "right", render: fmtNumber },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料出库明细表·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <AuxiliaryReportLayout title="辅料出库明细表" recordCount={displayRows.length}>
      <div style={auxiliaryReportFilterPanelStyle}>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <span>领料备注：</span>
            <Select<IssueRemark>
              value={issueRemark}
              onChange={setIssueRemark}
              style={{ width: 112 }}
              options={["全部", "生产领料", "样品领料", "维修领料"].map(value => ({ value: value as IssueRemark, label: value }))}
            />
            <span>到货情况</span>
            <Select<AuxiliaryIssueDetailArrivalStatus>
              value={arrivalStatus}
              onChange={setArrivalStatus}
              style={{ width: 86 }}
              options={["未到", "已到", "全部"].map(value => ({ value: value as AuxiliaryIssueDetailArrivalStatus, label: value }))}
            />
            <span>日期</span>
            <Select<AuxiliaryIssueDetailDateMode>
              value={dateMode}
              onChange={setDateMode}
              style={{ width: 104 }}
              options={["不选择日期", "开单日期", "领料日期"].map(value => ({ value: value as AuxiliaryIssueDetailDateMode, label: value }))}
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
          </Space>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <span>请选择条件：</span>
            <Select<SearchField>
              value={searchField}
              onChange={setSearchField}
              style={{ width: 128 }}
              options={["装配生产单号", "辅料编号", "辅料名称", "领料备注", "领料单号"].map(value => ({ value: value as SearchField, label: value }))}
            />
            <span>查询</span>
            <Input
              allowClear
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={() => load(false)}
              style={{ width: 210 }}
            />
            <Button icon={<SearchOutlined />} onClick={() => load(false)}>查询</Button>
            <Button icon={<SearchOutlined />} onClick={() => load(true)}>精确查询</Button>
            <Button icon={<SearchOutlined />} onClick={() => load(false)}>高级查询</Button>
          </Space>
      </div>

        <div style={auxiliaryReportTableContainerStyle}>
          <Table<AuxiliaryIssueDetailRow>
            rowKey={rowKey}
            size="small"
            loading={loading}
            dataSource={displayRows}
            columns={columns}
            pagination={false}
            locale={{ emptyText: "" }}
            scroll={{ x: 1538, y: 704 }}
            onRow={(row, index) => ({
              onClick: () => setSelectedKey(rowKey(row, index ?? 0)),
              style: {
                cursor: "default",
                color: getAuxiliaryIssueDetailTextColor(row),
                fontFamily: "Consolas, 'Microsoft YaHei', sans-serif",
              },
            })}
          />
        </div>
    </AuxiliaryReportLayout>
  );
}

function rowKey(row: AuxiliaryIssueDetailRow, index?: number) {
  return [
    row.装配生产单号 ?? "",
    row.辅料编号 ?? "",
    row.领料单号 ?? "no-issue",
    index ?? 0,
  ].join("|");
}
