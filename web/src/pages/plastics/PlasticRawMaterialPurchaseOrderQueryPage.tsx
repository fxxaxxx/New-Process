import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Select, Space, Table, Tabs, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  plasticRawMaterialPurchaseOrderQueryApi,
  type PlasticRawMaterialPurchaseOrderQueryDetailRow,
  type PlasticRawMaterialPurchaseOrderQuerySummaryRow,
} from "../../api/plasticRawMaterialPurchaseOrderQuery";
import { plasticRawMaterialMasterApi, type PlasticRawMaterialCategoryNode } from "../../api/plasticRawMaterialMaster";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料采购订单查询";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtExportDate = (v: unknown) => fmtDate(typeof v === "string" ? v : undefined);
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));

export default function PlasticRawMaterialPurchaseOrderQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [tab, setTab] = useState<"summary" | "detail">("summary");
  const [categories, setCategories] = useState<PlasticRawMaterialCategoryNode[]>([]);
  const [category, setCategory] = useState("");
  const [dateType, setDateType] = useState("订货日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [groupBySupplier, setGroupBySupplier] = useState(false);
  const [summary, setSummary] = useState<PlasticRawMaterialPurchaseOrderQuerySummaryRow[]>([]);
  const [detail, setDetail] = useState<PlasticRawMaterialPurchaseOrderQueryDetailRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canOpen) plasticRawMaterialMasterApi.categories().then(setCategories).catch(() => { /* 类别失败不阻塞查询 */ });
  }, [canOpen]);

  const params = useMemo(() => ({
    起: range[0].format("YYYY-MM-DD"),
    止: range[1].format("YYYY-MM-DD"),
    keyword: keyword.trim() || undefined,
    物料类别: category || undefined,
    日期类型: dateType,
    按供应商: groupBySupplier,
  }), [category, dateType, groupBySupplier, keyword, range]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      if (tab === "summary") setSummary(await plasticRawMaterialPurchaseOrderQueryApi.summary(params));
      else setDetail(await plasticRawMaterialPurchaseOrderQueryApi.detail(params));
    } catch {
      message.error("加载原料采购订单查询失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, params, tab]);

  useEffect(() => { load(); }, [load]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const categoryOptions = useMemo(() => [
    { value: "", label: "所有类别" },
    ...categories.filter(x => x.类别).map(x => ({ value: x.类别!, label: `${x.类别}(${x.数量})` })),
  ], [categories]);

  const summaryColumns: ColumnsType<PlasticRawMaterialPurchaseOrderQuerySummaryRow> = [
    ...(groupBySupplier ? [
      { title: "供应商编号", dataIndex: "供应商编号", width: 120 },
      { title: "供应商名称", dataIndex: "供应商名称", width: 180 },
    ] satisfies ColumnsType<PlasticRawMaterialPurchaseOrderQuerySummaryRow> : []),
    { title: "原料编号", dataIndex: "原料编号", width: 130, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "原料名称", dataIndex: "原料名称", width: 260 },
    { title: "产地", dataIndex: "产地", width: 120 },
    { title: "单位", dataIndex: "单位", width: 90 },
    { title: "订货数量", dataIndex: "订货数量", width: 120, align: "right", render: fmtNum },
  ];

  const detailPriceColumns: ColumnsType<PlasticRawMaterialPurchaseOrderQueryDetailRow> = priceHidden ? [] : [
    { title: "单价", dataIndex: "单价", width: 90, align: "right", render: fmtNum },
    { title: "金额", dataIndex: "金额", width: 110, align: "right", render: fmtNum },
  ];
  const detailColumns: ColumnsType<PlasticRawMaterialPurchaseOrderQueryDetailRow> = [
    { title: "订购日期", dataIndex: "订购日期", width: 105, render: fmtDate },
    { title: "交货日期", dataIndex: "交货日期", width: 105, render: fmtDate },
    { title: "单号", dataIndex: "单号", width: 130, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "供应商编号", dataIndex: "供应商编号", width: 120 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 170 },
    { title: "原料编号", dataIndex: "原料编号", width: 120, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "原料名称", dataIndex: "原料名称", width: 220 },
    { title: "产地", dataIndex: "产地", width: 120 },
    { title: "单位", dataIndex: "单位", width: 80 },
    { title: "单价类型", dataIndex: "单价类型", width: 95 },
    { title: "订货数量", dataIndex: "订货数量", width: 100, align: "right", render: fmtNum },
    ...detailPriceColumns,
    { title: "审核", dataIndex: "审核", width: 80, align: "center", render: (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
    { title: "备注", dataIndex: "备注", width: 180 },
  ];

  const summaryExportCols: ExportCol[] = [
    ...(groupBySupplier ? [{ title: "供应商编号", key: "供应商编号" }, { title: "供应商名称", key: "供应商名称" }] : []),
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "产地", key: "产地" },
    { title: "单位", key: "单位" },
    { title: "订货数量", key: "订货数量" },
  ];
  const detailExportCols: ExportCol[] = [
    { title: "订购日期", key: "订购日期", fmt: fmtExportDate },
    { title: "交货日期", key: "交货日期", fmt: fmtExportDate },
    { title: "单号", key: "单号" },
    { title: "供应商编号", key: "供应商编号" },
    { title: "供应商名称", key: "供应商名称" },
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "产地", key: "产地" },
    { title: "单位", key: "单位" },
    { title: "单价类型", key: "单价类型" },
    { title: "订货数量", key: "订货数量" },
    ...(priceHidden ? [] : [{ title: "单价", key: "单价" }, { title: "金额", key: "金额" }]),
    { title: "审核", key: "审核", fmt: v => v === "1" ? "已审核" : "未审核" },
    { title: "备注", key: "备注" },
  ];

  const activeRows = tab === "summary" ? summary : detail;
  const activeCols = tab === "summary" ? summaryExportCols : detailExportCols;
  const activeTitle = tab === "summary" ? "原料采购订单汇总查询" : "原料采购订单明细查询";
  const totalQty = activeRows.reduce((s, r) => s + Number((r as { 订货数量?: number | null }).订货数量 ?? 0), 0);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“原料采购订单查询·打开”权限）。</div></Card>;
  }

  return (
    <Card title="原料采购订单查询" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button.Group>
          <Button onClick={() => jumpMonth(-1)}>上月</Button>
          <Button onClick={() => jumpMonth(0)}>本月</Button>
          <Button onClick={() => jumpMonth(1)}>下月</Button>
        </Button.Group>
        <Select value={category} onChange={setCategory} style={{ width: 160 }} options={categoryOptions} />
        <Select value={dateType} onChange={setDateType} style={{ width: 110 }}
          options={[{ value: "订货日期" }, { value: "交货日期" }]} />
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Input.Search placeholder="原料编号/名称/单号/供应商" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 280 }} />
        <Checkbox checked={groupBySupplier} disabled={tab !== "summary"} onChange={e => setGroupBySupplier(e.target.checked)}>按供应商</Checkbox>
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={() => downloadCsv(`${activeTitle}.csv`, activeCols, activeRows as unknown as Record<string, unknown>[])}>导出EXCEL</Button>
        <Button onClick={() => printTable(activeTitle, activeCols, activeRows as unknown as Record<string, unknown>[])}>打印</Button>
        <span style={{ color: "#888" }}>共 {activeRows.length} 条</span>
      </Space>
      <Tabs activeKey={tab} onChange={k => setTab(k as "summary" | "detail")}
        items={[
          {
            key: "summary",
            label: "汇总查询",
            children: (
              <Table
                rowKey={(_, i) => `s${i}`}
                size="small"
                loading={loading}
                dataSource={summary}
                columns={summaryColumns}
                scroll={{ x: "max-content" }}
                pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={groupBySupplier ? 6 : 4}><b>合计</b></Table.Summary.Cell>
                      <Table.Summary.Cell index={groupBySupplier ? 6 : 4} align="right"><b>{fmtNum(totalQty)}</b></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            ),
          },
          {
            key: "detail",
            label: "明细查询",
            children: (
              <Table
                rowKey={(_, i) => `d${i}`}
                size="small"
                loading={loading}
                dataSource={detail}
                columns={detailColumns}
                scroll={{ x: "max-content" }}
                pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={10}><b>合计</b></Table.Summary.Cell>
                      <Table.Summary.Cell index={10} align="right"><b>{fmtNum(totalQty)}</b></Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            ),
          },
        ]}
      />
    </Card>
  );
}
