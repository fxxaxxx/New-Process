import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Input, Select, Space, Table, Tree, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { SearchOutlined } from "@ant-design/icons";
import { auxiliaryInventoryApi } from "../../api/auxiliaryInventory";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  buildAuxiliaryInventoryQuery,
  toAuxiliaryInventoryRow,
  type AuxiliaryInventoryRow,
} from "../../utils/auxiliaryInventory";

import {
  AuxiliaryReportLayout,
  auxiliaryReportFilterPanelStyle,
  auxiliaryReportFilterRowStyle,
  auxiliaryReportMainPanelStyle,
  auxiliaryReportSidePanelStyle,
  auxiliaryReportSplitStyle,
} from "./AuxiliaryReportLayout";

const MENU = "辅料库存统计表";

type DisplayMode = "有发生的记录" | "全部记录";
type StockMode = "只显示库存数" | "显示全部";
type SearchField = "辅料名称" | "辅料编号" | "规格" | "仓库位置";

const fmtQty = (value: number | undefined) => {
  if (value == null) return "";
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 });
};

export default function AuxiliaryInventoryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [displayMode, setDisplayMode] = useState<DisplayMode>("有发生的记录");
  const [onlyZero, setOnlyZero] = useState(false);
  const [stockMode, setStockMode] = useState<StockMode>("只显示库存数");
  const [searchField, setSearchField] = useState<SearchField>("辅料名称");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<AuxiliaryInventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string>();

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const query = buildAuxiliaryInventoryQuery(keyword);
      const result = await auxiliaryInventoryApi.list(query.keyword);
      const mapped = result.map(toAuxiliaryInventoryRow);
      setRows(mapped);
      setSelectedKey(mapped[0]?.辅料编号);
    } catch {
      message.error("加载辅料库存统计表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, keyword]);

  useEffect(() => { load(); }, [load]);

  const displayRows = useMemo(() => {
    const kw = keyword.trim();
    return rows.filter(row => {
      const qty = Number(row.库存数量 ?? 0);
      if (onlyZero && qty !== 0) return false;
      if (!onlyZero && stockMode === "只显示库存数" && qty === 0) return false;
      if (displayMode === "有发生的记录" && qty === 0) return false;
      if (!kw) return true;
      const value = String(row[searchField] ?? "");
      return value.includes(kw);
    });
  }, [displayMode, keyword, onlyZero, rows, searchField, stockMode]);

  const columns: ColumnsType<AuxiliaryInventoryRow> = [
    {
      title: "",
      key: "selector",
      width: 28,
      fixed: "left",
      render: (_, row) => (row.辅料编号 === selectedKey ? "▶" : ""),
    },
    { title: "辅料编号", dataIndex: "辅料编号", width: 160 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 330 },
    { title: "规格", dataIndex: "规格", width: 125 },
    { title: "每单位数值", dataIndex: "每单位数值", width: 135 },
    { title: "单位", dataIndex: "单位", width: 85 },
    {
      title: "库存数量",
      dataIndex: "库存数量",
      width: 125,
      align: "right",
      render: fmtQty,
    },
    { title: "仓库位置", dataIndex: "仓库位置", width: 220 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权限访问该页面（缺少“辅料库存统计表·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <AuxiliaryReportLayout title="辅料库存统计表" recordCount={displayRows.length}>
      <div style={auxiliaryReportFilterPanelStyle}>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <span>显示</span>
            <Select<DisplayMode>
              value={displayMode}
              onChange={setDisplayMode}
              style={{ width: 116 }}
              options={["有发生的记录", "全部记录"].map(value => ({ value, label: value }))}
            />
            <Checkbox checked={onlyZero} onChange={e => setOnlyZero(e.target.checked)}>零库存</Checkbox>
            <Select<StockMode>
              value={stockMode}
              onChange={setStockMode}
              style={{ width: 122 }}
              options={["只显示库存数", "显示全部"].map(value => ({ value, label: value }))}
            />
          </Space>
          <Space wrap size={8} style={auxiliaryReportFilterRowStyle}>
            <span>请选择条件：</span>
            <Select<SearchField>
              value={searchField}
              onChange={setSearchField}
              style={{ width: 116 }}
              options={["辅料名称", "辅料编号", "规格", "仓库位置"].map(value => ({ value: value as SearchField, label: value }))}
            />
            <span>查询</span>
            <Input
              allowClear
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onPressEnter={load}
              style={{ width: 240 }}
            />
            <Button icon={<SearchOutlined />} onClick={load}>查询</Button>
            <Button icon={<SearchOutlined />} onClick={load}>精确查询</Button>
          </Space>
      </div>

        <div style={auxiliaryReportSplitStyle}>
          <div style={auxiliaryReportSidePanelStyle}>
            <Tree
              defaultExpandAll
              selectedKeys={["辅料资料"]}
              treeData={[
                {
                  title: "<所有物料>",
                  key: "all",
                  children: [{ title: "[8]辅料资料", key: "辅料资料", isLeaf: true }],
                },
              ]}
              style={{ paddingTop: 4 }}
            />
          </div>
          <div style={auxiliaryReportMainPanelStyle}>
            <Table<AuxiliaryInventoryRow>
              rowKey={row => `${row.辅料编号}-${row.仓库位置 ?? ""}`}
              size="small"
              loading={loading}
              dataSource={displayRows}
              columns={columns}
              pagination={false}
              locale={{ emptyText: "" }}
              scroll={{ x: 1200, y: 704 }}
              onRow={row => ({
                onClick: () => setSelectedKey(row.辅料编号),
                style: { cursor: "default" },
              })}
            />
          </div>
        </div>
    </AuxiliaryReportLayout>
  );
}
