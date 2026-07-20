import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Descriptions, Drawer, Input, Select, Space, Table, Tabs, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  assemblyMaterialSummaryApi,
  type AssemblyMaterialDetailRow,
  type AssemblyMaterialSummaryRow,
} from "../../api/assemblyMaterialSummary";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "款号资料";
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

interface CustomerPick {
  客户编号?: string;
  客户名称?: string;
}

const customersApi = masterApi("customers");
const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtExportDate = (v: unknown) => fmtDate(typeof v === "string" ? v : undefined);
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));
const display = (v: unknown) => (v == null || v === "" ? "-" : String(v));
const displayDate = (v?: string) => display(fmtDate(v));

type ViewingRow =
  | { type: "summary"; row: AssemblyMaterialSummaryRow }
  | { type: "detail"; row: AssemblyMaterialDetailRow }
  | null;

export default function AssemblyMaterialSummaryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [activeTab, setActiveTab] = useState("summary");
  const [dateType, setDateType] = useState("不选择");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [warehouse, setWarehouse] = useState("全部");
  const [customer, setCustomer] = useState("全部");
  const [category, setCategory] = useState("全部");
  const [method, setMethod] = useState("全部");
  const [completion, setCompletion] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [customers, setCustomers] = useState<CustomerPick[]>([]);
  const [summaryRows, setSummaryRows] = useState<AssemblyMaterialSummaryRow[]>([]);
  const [detailRows, setDetailRows] = useState<AssemblyMaterialDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<ViewingRow>(null);

  useEffect(() => {
    if (!canOpen) return;
    customersApi.list(1, 500, "")
      .then(r => setCustomers(r.items as CustomerPick[]))
      .catch(() => setCustomers([]));
  }, [canOpen]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const useDate = dateType !== "不选择";
      const data = await assemblyMaterialSummaryApi.list({
        启用日期: useDate,
        起: useDate ? range[0].format("YYYY-MM-DD") : undefined,
        止: useDate ? range[1].format("YYYY-MM-DD") : undefined,
        客户: customer === "全部" ? undefined : customer,
        装配方式: method === "全部" ? undefined : method,
        完成情况: completion === "全部" ? undefined : completion,
        keyword: keyword.trim() || undefined,
      });
      setSummaryRows(data.汇总);
      setDetailRows(data.明细);
    } catch {
      message.error("加载装配物料汇总表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, completion, customer, dateType, keyword, method, range]);

  useEffect(() => { load(); }, [load]);

  const customerOptions = useMemo(() => [
    { value: "全部", label: "全部" },
    ...customers
      .filter(c => c.客户编号)
      .map(c => ({ value: `${c.客户编号} ${c.客户名称 ?? ""}`.trim(), label: `${c.客户编号} ${c.客户名称 ?? ""}`.trim() })),
  ], [customers]);

  const summaryColumns: ColumnsType<AssemblyMaterialSummaryRow> = useMemo(() => [
    { title: "序号", width: 60, render: (_v, _r, i) => i + 1 },
    { title: "客户", dataIndex: "客户", width: 100 },
    { title: "产品货号", dataIndex: "产品货号", width: 130, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "产品名称", dataIndex: "产品名称", width: 170 },
    { title: "配件编号", dataIndex: "配件编号", width: 120 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
    { title: "日期", dataIndex: "日期", width: 110, render: fmtDate },
    { title: "加工厂名称", dataIndex: "加工厂名称", width: 150 },
    { title: "装配方式", dataIndex: "装配方式", width: 140 },
    { title: "对比相差", dataIndex: "对比相差", width: 95, align: "right", render: fmtNum },
    { title: "相关比例", dataIndex: "相关比例", width: 95, align: "center" },
    { title: "仓库位置", dataIndex: "仓库位置", width: 160 },
    { title: "需求用量", dataIndex: "需求用量", width: 95, align: "right", render: fmtNum },
    { title: "操作员", dataIndex: "操作员", width: 100 },
    { title: "备注", dataIndex: "备注", width: 180 },
  ], []);

  const detailColumns: ColumnsType<AssemblyMaterialDetailRow> = useMemo(() => [
    { title: "客户", dataIndex: "客户", width: 100 },
    { title: "产品货号", dataIndex: "产品货号", width: 130, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "产品名称", dataIndex: "产品名称", width: 170 },
    { title: "配件编号", dataIndex: "配件编号", width: 120 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
    { title: "日期", dataIndex: "日期", width: 110, render: fmtDate },
    { title: "装配方式", dataIndex: "装配方式", width: 140 },
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 180 },
    { title: "规格", dataIndex: "规格", width: 140 },
    { title: "材料", dataIndex: "材料", width: 120 },
    { title: "颜色", dataIndex: "颜色", width: 100 },
    { title: "单位", dataIndex: "单位", width: 80 },
    { title: "用量", dataIndex: "用量", width: 90, align: "right", render: fmtNum },
    { title: "备注", dataIndex: "备注", width: 160 },
    { title: "操作员", dataIndex: "操作员", width: 100 },
  ], []);

  const viewingRow = viewing?.row;
  const viewingProductNo = viewingRow?.产品货号;
  const viewingDetails = useMemo(() => {
    if (!viewingProductNo) return [];
    return detailRows.filter(r => r.产品货号 === viewingProductNo);
  }, [detailRows, viewingProductNo]);

  const summaryExportCols: ExportCol[] = [
    { title: "客户", key: "客户" },
    { title: "产品货号", key: "产品货号" },
    { title: "产品名称", key: "产品名称" },
    { title: "配件编号", key: "配件编号" },
    { title: "产品装配名称", key: "产品装配名称" },
    { title: "日期", key: "日期", fmt: fmtExportDate },
    { title: "加工厂名称", key: "加工厂名称" },
    { title: "装配方式", key: "装配方式" },
    { title: "对比相差", key: "对比相差" },
    { title: "相关比例", key: "相关比例" },
    { title: "仓库位置", key: "仓库位置" },
    { title: "需求用量", key: "需求用量" },
    { title: "操作员", key: "操作员" },
    { title: "备注", key: "备注" },
  ];
  const detailExportCols: ExportCol[] = [
    { title: "客户", key: "客户" },
    { title: "产品货号", key: "产品货号" },
    { title: "产品名称", key: "产品名称" },
    { title: "配件编号", key: "配件编号" },
    { title: "产品装配名称", key: "产品装配名称" },
    { title: "日期", key: "日期", fmt: fmtExportDate },
    { title: "装配方式", key: "装配方式" },
    { title: "物料编号", key: "物料编号" },
    { title: "物料名称", key: "物料名称" },
    { title: "规格", key: "规格" },
    { title: "材料", key: "材料" },
    { title: "颜色", key: "颜色" },
    { title: "单位", key: "单位" },
    { title: "用量", key: "用量" },
    { title: "备注", key: "备注" },
    { title: "操作员", key: "操作员" },
  ];

  const activeRows = activeTab === "summary" ? summaryRows : detailRows;
  const activeExportCols = activeTab === "summary" ? summaryExportCols : detailExportCols;
  const activeTitle = activeTab === "summary" ? "装配物料汇总表" : "装配物料明细表";

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权限访问该页面</div></Card>;
  }

  return (
    <Card title="装配物料汇总表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => setRange([range[0].subtract(1, "month"), range[1].subtract(1, "month")])}>上月</Button>
        <Button onClick={() => setRange(defaultRange())}>本月</Button>
        <Button onClick={() => setRange([range[0].add(1, "month"), range[1].add(1, "month")])}>下月</Button>
        <span>计算</span>
        <Select value="全部" style={{ width: 90 }} options={[{ value: "全部", label: "全部" }]} />
        <span>仓库</span>
        <Select value={warehouse} style={{ width: 110 }} onChange={setWarehouse} options={[{ value: "全部", label: "全部" }]} />
        <span>客户</span>
        <Select showSearch value={customer} style={{ width: 170 }} onChange={setCustomer} options={customerOptions} />
        <span>类别</span>
        <Select value={category} style={{ width: 120 }} onChange={setCategory}
          options={["全部", "成品", "半成品", "未包装半成品"].map(v => ({ value: v, label: v }))} />
        <span>装配方式</span>
        <Select value={method} style={{ width: 150 }} onChange={setMethod}
          options={["全部", "包装(已装箱)", "组装半成品"].map(v => ({ value: v, label: v }))} />
        <span>完成情况</span>
        <Select value={completion} style={{ width: 120 }} onChange={setCompletion}
          options={["全部", "已审核", "未审核", "已完成", "未完成"].map(v => ({ value: v, label: v }))} />
      </Space>
      <Space style={{ marginBottom: 12 }} wrap>
        <span>日期</span>
        <Select value={dateType} style={{ width: 110 }} onChange={setDateType}
          options={["不选择", "日期"].map(v => ({ value: v, label: v }))} />
        <DatePicker.RangePicker value={range} allowClear={false} disabled={dateType === "不选择"}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <span>请选择条件</span>
        <Select value="产品货号" style={{ width: 120 }} options={["产品货号", "产品名称", "配件编号", "物料编号", "物料名称"].map(v => ({ value: v, label: v }))} />
        <Input.Search placeholder="查询" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 260 }} />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={load}>精确查询</Button>
        <Button onClick={() => downloadCsv(`${activeTitle}.csv`, activeExportCols, activeRows as unknown as Record<string, unknown>[])}>导出EXCEL</Button>
        <Button onClick={() => printTable(activeTitle, activeExportCols, activeRows as unknown as Record<string, unknown>[])}>打印</Button>
        <Button disabled>生成装配采购单</Button>
        <span style={{ color: "#888" }}>共 {activeRows.length} 条</span>
      </Space>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "summary",
            label: "装配物料汇总表",
            children: (
              <Table
                rowKey={(_, i) => `s-${i}`}
                size="small"
                loading={loading}
                dataSource={summaryRows}
                columns={summaryColumns}
                onRow={record => ({
                  onClick: () => setViewing({ type: "summary", row: record }),
                  style: { cursor: "pointer" },
                })}
                scroll={{ x: "max-content", y: 560 }}
                pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
              />
            ),
          },
          {
            key: "detail",
            label: "装配物料明细表",
            children: (
              <Table
                rowKey={(_, i) => `d-${i}`}
                size="small"
                loading={loading}
                dataSource={detailRows}
                columns={detailColumns}
                onRow={record => ({
                  onClick: () => setViewing({ type: "detail", row: record }),
                  style: { cursor: "pointer" },
                })}
                scroll={{ x: "max-content", y: 560 }}
                pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
              />
            ),
          },
        ]}
      />
      <Drawer
        title={viewing?.type === "detail" ? "装配物料明细详情" : "装配物料汇总详情"}
        width={980}
        open={!!viewing}
        onClose={() => setViewing(null)}
        destroyOnClose
      >
        {viewing && (
          <>
            <Descriptions title="产品信息" size="small" bordered column={3}>
              <Descriptions.Item label="客户">{display(viewing.row.客户)}</Descriptions.Item>
              <Descriptions.Item label="产品货号">{display(viewing.row.产品货号)}</Descriptions.Item>
              <Descriptions.Item label="产品名称">{display(viewing.row.产品名称)}</Descriptions.Item>
              <Descriptions.Item label="配件编号">{display(viewing.row.配件编号)}</Descriptions.Item>
              <Descriptions.Item label="产品装配名称">{display(viewing.row.产品装配名称)}</Descriptions.Item>
              <Descriptions.Item label="日期">{displayDate(viewing.row.日期)}</Descriptions.Item>
              <Descriptions.Item label="装配方式">{display(viewing.row.装配方式)}</Descriptions.Item>
              <Descriptions.Item label="操作员">{display(viewing.row.操作员)}</Descriptions.Item>
              <Descriptions.Item label="备注">{display(viewing.row.备注)}</Descriptions.Item>
            </Descriptions>

            {viewing.type === "summary" && (
              <Descriptions title="汇总信息" size="small" bordered column={3} style={{ marginTop: 16 }}>
                <Descriptions.Item label="加工厂名称">{display(viewing.row.加工厂名称)}</Descriptions.Item>
                <Descriptions.Item label="对比相差">{display(fmtNum(viewing.row.对比相差))}</Descriptions.Item>
                <Descriptions.Item label="相关比例">{display(viewing.row.相关比例)}</Descriptions.Item>
                <Descriptions.Item label="仓库位置">{display(viewing.row.仓库位置)}</Descriptions.Item>
                <Descriptions.Item label="需求用量">{display(fmtNum(viewing.row.需求用量))}</Descriptions.Item>
              </Descriptions>
            )}

            {viewing.type === "detail" && (
              <Descriptions title="物料信息" size="small" bordered column={3} style={{ marginTop: 16 }}>
                <Descriptions.Item label="物料编号">{display(viewing.row.物料编号)}</Descriptions.Item>
                <Descriptions.Item label="物料名称">{display(viewing.row.物料名称)}</Descriptions.Item>
                <Descriptions.Item label="规格">{display(viewing.row.规格)}</Descriptions.Item>
                <Descriptions.Item label="材料">{display(viewing.row.材料)}</Descriptions.Item>
                <Descriptions.Item label="颜色">{display(viewing.row.颜色)}</Descriptions.Item>
                <Descriptions.Item label="单位">{display(viewing.row.单位)}</Descriptions.Item>
                <Descriptions.Item label="用量">{display(fmtNum(viewing.row.用量))}</Descriptions.Item>
              </Descriptions>
            )}

            <div style={{ margin: "18px 0 8px", fontWeight: 600 }}>同产品物料明细</div>
            <Table
              rowKey={(record, i) => `${record.产品货号 ?? "product"}-${record.物料编号 ?? "material"}-${i}`}
              size="small"
              dataSource={viewingDetails}
              columns={detailColumns}
              scroll={{ x: "max-content", y: 360 }}
              pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
            />
          </>
        )}
      </Drawer>
    </Card>
  );
}
