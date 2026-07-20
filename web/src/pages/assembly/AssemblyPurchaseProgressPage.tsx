import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, DatePicker, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { assemblyPurchaseQueryApi, type AssemblyPurchaseDetailRow } from "../../api/assemblyPurchaseQuery";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "款号资料";
const ALL = "全部";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];
const wideRange = () => ({
  起: "2000-01-01",
  止: dayjs().add(1, "year").format("YYYY-MM-DD"),
});
const fmtDate = (v?: string | null) => (v ? String(v).slice(0, 10) : "");
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v).toLocaleString());

interface ProgressRow {
  订购日期?: string;
  完成日期?: string;
  入库日期?: string;
  订单单号?: string;
  加工厂编号?: string;
  加工厂名称?: string;
  产品货号?: string;
  产品名称?: string;
  配件编号?: string;
  产品装配名称?: string;
  装配方式?: string;
  生产接单日期?: string;
  生产单号?: string;
  货币?: string;
  订货数量?: number | null;
  入仓数量?: number | null;
  相差数量?: number | null;
  出货情况?: string;
}

const toProgressRow = (row: AssemblyPurchaseDetailRow): ProgressRow => {
  const qty = Number(row.数量 ?? 0);
  const inQty = 0;
  return {
    订购日期: row.开单日期,
    完成日期: row.完成日期,
    入库日期: undefined,
    订单单号: row.单号,
    加工厂编号: row.供应商编号,
    加工厂名称: row.供应商名称,
    产品货号: row.产品货号,
    产品名称: row.产品装配名称,
    配件编号: row.配件编号,
    产品装配名称: row.产品装配名称,
    装配方式: row.装配方式,
    生产接单日期: undefined,
    生产单号: row.生产单号,
    货币: row.货币,
    订货数量: qty,
    入仓数量: inQty,
    相差数量: qty - inQty,
    出货情况: qty - inQty > 0 ? "未到" : "已到",
  };
};

export default function AssemblyPurchaseProgressPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const navigate = useNavigate();
  const [arrival, setArrival] = useState("未到");
  const [dateMode, setDateMode] = useState("不选择日期");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [warehouse, setWarehouse] = useState(ALL);
  const [keyword, setKeyword] = useState("");
  const [onlyDueSoon, setOnlyDueSoon] = useState(false);
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(false);

  const queryRange = useMemo(() => (
    dateMode === "不选择日期"
      ? wideRange()
      : { 起: range[0].format("YYYY-MM-DD"), 止: range[1].format("YYYY-MM-DD") }
  ), [dateMode, range]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const data = await assemblyPurchaseQueryApi.detail({
        ...queryRange,
        keyword: keyword.trim() || undefined,
        收货仓库: warehouse === ALL ? undefined : warehouse,
      });
      setRows(data.map(toProgressRow));
    } catch {
      message.error("加载装配采购进度表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, keyword, queryRange, warehouse]);

  useEffect(() => { load(); }, [load]);

  const filteredRows = useMemo(() => {
    const now = dayjs();
    return rows.filter(r => {
      if (arrival !== ALL && r.出货情况 !== arrival) return false;
      if (onlyDueSoon) {
        const due = r.完成日期 ? dayjs(r.完成日期) : null;
        if (!due || due.diff(now, "day") < 0 || due.diff(now, "day") > 3) return false;
      }
      return true;
    });
  }, [arrival, onlyDueSoon, rows]);

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setDateMode("订购日期");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const openOrder = (单号?: string) => {
    if (!单号) return;
    navigate(`/assembly-purchase-orders?单号=${encodeURIComponent(单号)}`);
  };

  const columns: ColumnsType<ProgressRow> = [
    { title: "订购日期", dataIndex: "订购日期", width: 100, render: fmtDate },
    { title: "完成日期", dataIndex: "完成日期", width: 100, render: fmtDate },
    { title: "入库日期", dataIndex: "入库日期", width: 100, render: fmtDate },
    { title: "订单单号", dataIndex: "订单单号", width: 125, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "加工厂编号", dataIndex: "加工厂编号", width: 105 },
    { title: "加工厂名称", dataIndex: "加工厂名称", width: 160 },
    { title: "产品货号", dataIndex: "产品货号", width: 130 },
    { title: "产品名称", dataIndex: "产品名称", width: 160 },
    { title: "配件编号", dataIndex: "配件编号", width: 110 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 170 },
    { title: "装配方式", dataIndex: "装配方式", width: 130 },
    { title: "生产接单日期", dataIndex: "生产接单日期", width: 120, render: fmtDate },
    { title: "生产单号", dataIndex: "生产单号", width: 130 },
    { title: "货币", dataIndex: "货币", width: 70 },
    { title: "订货数量", dataIndex: "订货数量", width: 100, align: "right", render: fmtNum },
    { title: "入仓数量", dataIndex: "入仓数量", width: 100, align: "right", render: fmtNum },
    { title: "相差数量", dataIndex: "相差数量", width: 100, align: "right", render: fmtNum },
    { title: "出货情况", dataIndex: "出货情况", width: 90 },
  ];

  const exportCols: ExportCol[] = columns.map(c => {
    const key = String((c as { dataIndex?: string }).dataIndex ?? "");
    return {
      title: String(c.title),
      key,
      fmt: key.includes("日期") ? v => String(v ?? "").slice(0, 10) : undefined,
    };
  });

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面</div></Card>;
  }

  return (
    <Card title="装配采购进度表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <span>到货情况</span>
        <Select value={arrival} onChange={setArrival} style={{ width: 110 }}
          options={["未到", "已到", ALL].map(v => ({ value: v, label: v }))} />
        <span>日期</span>
        <Select value={dateMode} onChange={setDateMode} style={{ width: 130 }}
          options={["不选择日期", "订购日期"].map(v => ({ value: v, label: v }))} />
        <DatePicker.RangePicker
          value={range}
          disabled={dateMode === "不选择日期"}
          allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }}
        />
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <span>收货仓库</span>
        <Select value={warehouse} onChange={setWarehouse} style={{ width: 120 }}
          options={[ALL, "成品仓", "半成品仓"].map(v => ({ value: v, label: v }))} />
        <Checkbox checked={onlyDueSoon} onChange={e => setOnlyDueSoon(e.target.checked)}>只显示3天内交货的订单</Checkbox>
      </Space>
      <Space style={{ marginBottom: 12 }} wrap>
        <span>请选择条件</span>
        <Select value="生产单号" style={{ width: 120 }}
          options={["生产单号", "订单单号", "产品货号", "产品名称", "加工厂名称"].map(v => ({ value: v, label: v }))} />
        <Input.Search
          placeholder="查询"
          allowClear
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          onSearch={load}
          style={{ width: 260 }}
        />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={load}>精确查询</Button>
        <Button onClick={() => downloadCsv("装配采购进度表.csv", exportCols, filteredRows as unknown as Record<string, unknown>[])}>导出EXCEL</Button>
        <Button onClick={() => printTable("装配采购进度表", exportCols, filteredRows as unknown as Record<string, unknown>[])}>打印</Button>
        <Button danger onClick={() => window.history.back()}>关闭</Button>
        <span style={{ color: "#888" }}>共 {filteredRows.length} 条，双击行打开装配加工单</span>
      </Space>
      <Table
        rowKey={(r, i) => r.订单单号 ?? String(i)}
        size="small"
        loading={loading}
        dataSource={filteredRows}
        columns={columns}
        scroll={{ x: "max-content", y: 620 }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onDoubleClick: () => openOrder(r.订单单号), style: { cursor: "pointer" } })}
      />
    </Card>
  );
}
