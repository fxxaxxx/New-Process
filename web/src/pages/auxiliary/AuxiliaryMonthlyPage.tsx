import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  LeftOutlined,
  SearchOutlined,
  RightOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { auxiliaryMonthlyApi } from "../../api/auxiliaryMonthly";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryMonthlyQuery,
  toAuxiliaryMonthlyRow,
  type AuxiliaryMonthlyRow,
} from "../../utils/auxiliaryMonthly";

import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
  auxiliaryReportTableContainerStyle,
} from "./AuxiliaryReportLayout";

const MENU = "辅料库存月报表";

type SearchField = "辅料名称" | "辅料编号" | "规格";

const fmtQty = (value: number | undefined) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

const monthRange = (base: Dayjs) => ({
  start: base.startOf("month"),
  end: base.endOf("month"),
});

export default function AuxiliaryMonthlyPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const initial = monthRange(dayjs());
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [searchField, setSearchField] = useState<SearchField>("辅料名称");
  const [keyword, setKeyword] = useState("");
  const [exact, setExact] = useState(false);
  const [rows, setRows] = useState<AuxiliaryMonthlyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();

  const load = useCallback(async (exactMode = false) => {
    if (!canOpen) return;
    setExact(exactMode);
    setLoading(true);
    try {
      const query = buildAuxiliaryMonthlyQuery({
        起: start.format("YYYY-MM-DD"),
        止: end.format("YYYY-MM-DD"),
        keyword,
      });
      const result = await auxiliaryMonthlyApi.list(query.起, query.止, query.keyword);
      const mapped = result.map(toAuxiliaryMonthlyRow);
      setRows(mapped);
      setSelectedKey(mapped[0]?.辅料编号);
    } catch {
      message.error("加载辅料库存月报表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, end, keyword, start]);

  useEffect(() => { load(false); }, [load]);

  const displayRows = useMemo(() => {
    const kw = keyword.trim();
    if (!kw) return rows;
    return rows.filter(row => {
      const value = String(row[searchField] ?? "");
      return exact ? value === kw : value.includes(kw);
    });
  }, [exact, keyword, rows, searchField]);

  const moveMonth = (delta: number) => {
    const range = monthRange(start.add(delta, "month"));
    setStart(range.start);
    setEnd(range.end);
  };

  const setCurrentMonth = () => {
    const range = monthRange(dayjs());
    setStart(range.start);
    setEnd(range.end);
  };

  const columns: ColumnsType<AuxiliaryMonthlyRow> = [
    {
      title: "",
      key: "selector",
      width: 28,
      fixed: "left",
      render: (_, row) => (row.辅料编号 === selectedKey ? "▶" : ""),
    },
    { title: "辅料编号", dataIndex: "辅料编号", width: 110 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 250 },
    { title: "规格", dataIndex: "规格", width: 108 },
    { title: "每单位数值", dataIndex: "每单位数值", width: 96 },
    { title: "单位", dataIndex: "单位", width: 78 },
    {
      title: "期初库存",
      children: [{ title: "数量", dataIndex: "期初库存", width: 100, align: "right", render: fmtQty }],
    },
    {
      title: "本期入库",
      children: [{ title: "数量", dataIndex: "本期入库", width: 100, align: "right", render: fmtQty }],
    },
    {
      title: "本期出库",
      children: [{ title: "数量", dataIndex: "本期出库", width: 100, align: "right", render: fmtQty }],
    },
    {
      title: "盘点盈亏",
      children: [{ title: "数量", dataIndex: "盘点盈亏", width: 100, align: "right", render: fmtQty }],
    },
    {
      title: "期末库存",
      children: [{ title: "数量", dataIndex: "期末库存", width: 100, align: "right", render: fmtQty }],
    },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料库存月报表·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <AuxiliaryReportLayout title="辅料库存月报表" recordCount={displayRows.length}>
      <div style={auxiliaryReportFilterPanelStyle}>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <Button icon={<LeftOutlined />} onClick={() => moveMonth(-1)}>上月</Button>
            <Button autoInsertSpace={false} onClick={setCurrentMonth}>本月</Button>
            <Button icon={<RightOutlined />} onClick={() => moveMonth(1)}>下月</Button>
            <Button>显示类别</Button>
          </Space>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <span>日期</span>
            <DatePicker
              allowClear={false}
              value={start}
              format="YYYY/M/D"
              onChange={value => value && setStart(value)}
              style={{ width: 112 }}
            />
            <span>至</span>
            <DatePicker
              allowClear={false}
              value={end}
              format="YYYY/M/D"
              onChange={value => value && setEnd(value)}
              style={{ width: 112 }}
            />
            <span>请选择条件：</span>
            <Select<SearchField>
              value={searchField}
              onChange={setSearchField}
              style={{ width: 116 }}
              options={["辅料名称", "辅料编号", "规格"].map(value => ({ value: value as SearchField, label: value }))}
            />
            <span>查询</span>
            <Input
              allowClear
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={() => load(false)}
              style={{ width: 190 }}
            />
            <Button icon={<SearchOutlined />} onClick={() => load(false)}>查询</Button>
            <Button icon={<SearchOutlined />} onClick={() => load(true)}>精确查询</Button>
          </Space>
      </div>

        <div style={auxiliaryReportTableContainerStyle}>
          <Table<AuxiliaryMonthlyRow>
            rowKey={row => row.辅料编号}
            size="small"
            loading={loading}
            dataSource={displayRows}
            columns={columns}
            pagination={false}
            locale={{ emptyText: "" }}
            scroll={{ x: 1180, y: 704 }}
            onRow={row => ({
              onClick: () => setSelectedKey(row.辅料编号),
              style: { cursor: "default" },
            })}
          />
        </div>
    </AuxiliaryReportLayout>
  );
}
