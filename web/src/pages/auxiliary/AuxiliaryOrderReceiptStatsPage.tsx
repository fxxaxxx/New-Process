import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  auxiliaryOrderReceiptStatsApi,
  type AuxiliaryOrderReceiptStatRow,
} from "../../api/auxiliaryOrderReceiptStats";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryOrderReceiptStatsQuery,
  toAuxiliaryOrderReceiptStatsRow,
  type AuxiliaryOrderReceiptStatsDateMode,
} from "../../utils/auxiliaryOrderReceiptStats";

import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
  auxiliaryReportTableContainerStyle,
} from "./AuxiliaryReportLayout";

const MENU = "辅料订货入库统计";

type SearchField = "辅料名称" | "辅料编号" | "规格" | "订购单号" | "供应商名称";

const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtDate = (value?: string) => {
  if (!value) return "";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("YYYY/M/D") : String(value).slice(0, 10);
};

const fmtNumber = (value?: number | null) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

const fmtMoney = (value?: number | null) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 });
};

export default function AuxiliaryOrderReceiptStatsPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [dateMode, setDateMode] = useState<AuxiliaryOrderReceiptStatsDateMode>("订购日期");
  const [searchField, setSearchField] = useState<SearchField>("辅料名称");
  const [keyword, setKeyword] = useState("");
  const [exact, setExact] = useState(false);
  const [rows, setRows] = useState<AuxiliaryOrderReceiptStatRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();

  const load = useCallback(async (exactMode = false) => {
    if (!canOpen) return;
    setExact(exactMode);
    setLoading(true);
    try {
      const query = buildAuxiliaryOrderReceiptStatsQuery({
        起: range[0].format("YYYY-MM-DD"),
        止: range[1].format("YYYY-MM-DD"),
        日期类型: dateMode,
        keyword,
      });
      const result = await auxiliaryOrderReceiptStatsApi.list(query.起, query.止, query.日期类型, query.keyword);
      const mapped = result.map(toAuxiliaryOrderReceiptStatsRow);
      setRows(mapped);
      setSelectedKey(mapped[0] ? `${mapped[0].订购单号 ?? ""}-${mapped[0].辅料编号 ?? ""}-${mapped[0].规格 ?? ""}` : undefined);
    } catch {
      message.error("加载辅料订货入库统计失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, dateMode, keyword, range]);

  useEffect(() => { load(false); }, [load]);

  const displayRows = useMemo(() => {
    const kw = keyword.trim();
    if (!kw) return rows;
    return rows.filter(row => {
      const value = String(row[searchField] ?? "");
      return exact ? value === kw : value.includes(kw);
    });
  }, [exact, keyword, rows, searchField]);

  const columns: ColumnsType<AuxiliaryOrderReceiptStatRow> = [
    {
      title: "",
      key: "selector",
      width: 34,
      fixed: "left",
      render: (_, row) => {
        const key = `${row.订购单号 ?? ""}-${row.辅料编号 ?? ""}-${row.规格 ?? ""}`;
        return key === selectedKey ? "▶" : "";
      },
    },
    { title: "订购日期", dataIndex: "订购日期", width: 90, render: fmtDate },
    { title: "交货日期", dataIndex: "交货日期", width: 90, render: fmtDate },
    { title: "订购单号", dataIndex: "订购单号", width: 96, render: (value?: string) => <span className="erp-num">{value}</span> },
    { title: "供应商名称", dataIndex: "供应商名称", width: 140 },
    { title: "辅料编号", dataIndex: "辅料编号", width: 88 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 160 },
    { title: "规格", dataIndex: "规格", width: 76 },
    { title: "单位", dataIndex: "单位", width: 84 },
    { title: "采购单价", dataIndex: "采购单价", width: 104, align: "right", render: fmtMoney },
    { title: "单价 HK$", dataIndex: "单价HKD", width: 78, align: "right", render: fmtMoney },
    { title: "其他成本单价(HK$)", dataIndex: "其他成本单价HKD", width: 116, align: "right", render: fmtMoney },
    {
      title: "订货情况",
      children: [
        { title: "数量", dataIndex: "订货数量", width: 92, align: "right", render: fmtNumber },
        { title: "金额(HK$)", dataIndex: "订货金额HKD", width: 92, align: "right", render: fmtMoney },
      ],
    },
    {
      title: "入库情况",
      children: [
        { title: "数量", dataIndex: "入库数量", width: 104, align: "right", render: fmtNumber },
        { title: "订货金额(HK$)", dataIndex: "入库订货金额HKD", width: 104, align: "right", render: fmtMoney },
        { title: "其他费用(HK$)", dataIndex: "入库其他费用HKD", width: 104, align: "right", render: fmtMoney },
        { title: "金额合计(HK$)", dataIndex: "入库金额合计HKD", width: 104, align: "right", render: fmtMoney },
      ],
    },
    {
      title: "相关情况",
      children: [
        { title: "数量", dataIndex: "相关数量", width: 90, align: "right", render: fmtNumber },
        { title: "金额(HK$)", dataIndex: "相关金额HKD", width: 90, align: "right", render: fmtMoney },
      ],
    },
    { title: "操作员", dataIndex: "操作员", width: 100 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料订货入库统计·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <AuxiliaryReportLayout title="辅料订货入库统计" recordCount={displayRows.length}>
      <div style={auxiliaryReportFilterPanelStyle}>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <span>日期</span>
            <Select<AuxiliaryOrderReceiptStatsDateMode>
              value={dateMode}
              onChange={setDateMode}
              style={{ width: 102 }}
              options={["订购日期", "交货日期"].map(value => ({ value: value as AuxiliaryOrderReceiptStatsDateMode, label: value }))}
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
              style={{ width: 116 }}
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
          </Space>
      </div>

        <div style={auxiliaryReportTableContainerStyle}>
          <Table<AuxiliaryOrderReceiptStatRow>
            rowKey={(row, index) => `${row.订购单号 ?? ""}-${row.辅料编号 ?? ""}-${row.规格 ?? ""}-${index}`}
            size="small"
            loading={loading}
            dataSource={displayRows}
            columns={columns}
            pagination={false}
            locale={{ emptyText: "" }}
            scroll={{ x: 2036, y: 704 }}
            onRow={row => ({
              onClick: () => setSelectedKey(`${row.订购单号 ?? ""}-${row.辅料编号 ?? ""}-${row.规格 ?? ""}`),
              style: { cursor: "default" },
            })}
          />
        </div>
    </AuxiliaryReportLayout>
  );
}
