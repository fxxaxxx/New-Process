import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  auxiliaryProgressDetailApi,
  type AuxiliaryProgressDetailRow,
} from "../../api/auxiliaryProgressDetail";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryProgressDetailQuery,
  getAuxiliaryProgressDetailTextColor,
  normalizeAuxiliaryProgressDetailRow,
  type AuxiliaryProgressDetailArrivalStatus,
  type AuxiliaryProgressDetailDateMode,
} from "../../utils/auxiliaryProgressDetail";

import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
  auxiliaryReportTableContainerStyle,
} from "./AuxiliaryReportLayout";

const MENU = "辅料进度明细表";

type SearchField = "辅料名称" | "辅料编号" | "规格" | "订购单号" | "供应商名称";

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtNumber = (value?: number | null) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export default function AuxiliaryProgressDetailPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [arrivalStatus, setArrivalStatus] = useState<AuxiliaryProgressDetailArrivalStatus>("未到");
  const [dateMode, setDateMode] = useState<AuxiliaryProgressDetailDateMode>("不选择日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [searchField, setSearchField] = useState<SearchField>("辅料名称");
  const [keyword, setKeyword] = useState("");
  const [exact, setExact] = useState(false);
  const [rows, setRows] = useState<AuxiliaryProgressDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();

  const load = useCallback(async (exactMode = false) => {
    if (!canOpen) return;
    setExact(exactMode);
    setLoading(true);
    try {
      const query = buildAuxiliaryProgressDetailQuery({
        arrivalStatus,
        dateMode,
        startDate: range[0].format("YYYY-MM-DD"),
        endDate: range[1].format("YYYY-MM-DD"),
        keyword,
      });
      const result = await auxiliaryProgressDetailApi.list(query);
      const mapped = result.map(normalizeAuxiliaryProgressDetailRow);
      setRows(mapped);
      setSelectedKey(mapped[0] ? rowKey(mapped[0], 0) : undefined);
    } catch {
      message.error("加载辅料进度明细表失败");
    } finally {
      setLoading(false);
    }
  }, [arrivalStatus, canOpen, dateMode, keyword, range]);

  useEffect(() => { load(false); }, [load]);

  const displayRows = useMemo(() => {
    const kw = keyword.trim();
    if (!kw) return rows;
    return rows.filter(row => {
      const value = String(row[searchField] ?? "");
      return exact ? value === kw : value.includes(kw);
    });
  }, [exact, keyword, rows, searchField]);

  const columns: ColumnsType<AuxiliaryProgressDetailRow> = [
    {
      title: "",
      key: "selector",
      width: 34,
      fixed: "left",
      render: (_, row, index) => (rowKey(row, index) === selectedKey ? "▶" : ""),
    },
    { title: "订购日期", dataIndex: "订购日期", width: 92 },
    { title: "交货日期", dataIndex: "交货日期", width: 92 },
    { title: "订购单号", dataIndex: "订购单号", width: 108, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "供应商名称", dataIndex: "供应商名称", width: 140 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 90 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 160 },
    { title: "规格", dataIndex: "规格", width: 84 },
    { title: "单位", dataIndex: "单位", width: 72 },
    { title: "单价类型", dataIndex: "单价类型", width: 84 },
    { title: "订货数量", dataIndex: "订货数量", width: 96, align: "right", render: fmtNumber },
    { title: "入仓日期", dataIndex: "入仓日期", width: 102 },
    { title: "入仓单号", dataIndex: "入仓单号", width: 108 },
    { title: "入仓数量", dataIndex: "入仓数量", width: 96, align: "right", render: fmtNumber },
    { title: "总入仓数", dataIndex: "总入仓数", width: 96, align: "right", render: fmtNumber },
    { title: "相差数量", dataIndex: "相差数量", width: 96, align: "right", render: fmtNumber },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料进度明细表·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <AuxiliaryReportLayout title="辅料进度明细表" recordCount={displayRows.length}>
      <div style={auxiliaryReportFilterPanelStyle}>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <span>到货情况</span>
            <Select<AuxiliaryProgressDetailArrivalStatus>
              value={arrivalStatus}
              onChange={setArrivalStatus}
              style={{ width: 86 }}
              options={["未到", "已到", "全部"].map(value => ({ value: value as AuxiliaryProgressDetailArrivalStatus, label: value }))}
            />
            <span>日期</span>
            <Select<AuxiliaryProgressDetailDateMode>
              value={dateMode}
              onChange={setDateMode}
              style={{ width: 104 }}
              options={["不选择日期", "订购日期", "交货日期"].map(value => ({ value: value as AuxiliaryProgressDetailDateMode, label: value }))}
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
              style={{ width: 112 }}
              options={["辅料名称", "辅料编号", "规格", "订购单号", "供应商名称"].map(value => ({ value: value as SearchField, label: value }))}
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
          <Table<AuxiliaryProgressDetailRow>
            rowKey={rowKey}
            size="small"
            loading={loading}
            dataSource={displayRows}
            columns={columns}
            pagination={false}
            locale={{ emptyText: "" }}
            scroll={{ x: 1510, y: 704 }}
            onRow={(row, index) => ({
              onClick: () => setSelectedKey(rowKey(row, index ?? 0)),
              style: {
                cursor: "default",
                color: getAuxiliaryProgressDetailTextColor(row),
                fontFamily: "Consolas, 'Microsoft YaHei', sans-serif",
              },
            })}
          />
        </div>
    </AuxiliaryReportLayout>
  );
}

function rowKey(row: AuxiliaryProgressDetailRow, index?: number) {
  return [
    row.订购单号 ?? "",
    row.辅料编号 ?? "",
    row.规格 ?? "",
    row.入仓单号 ?? "no-receipt",
    index ?? 0,
  ].join("|");
}
