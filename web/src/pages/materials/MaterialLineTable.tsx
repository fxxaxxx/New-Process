import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import { lineAmount, productionLinePatch, type DocLine } from "../../utils/materialLines";
import OrderLinePicker from "./OrderLinePicker";
import MaterialPicker from "./MaterialPicker";
import ProductionPicker from "./ProductionPicker";
import type { PurchaseOrderProgressRow } from "../../api/purchaseOrders";
import type { MaterialRow } from "../../api/materialMaster";
import type { ProductionTrackingRow } from "../../api/productionReports";

// 受控物料明细行编辑表。
// usageCols(领料/退料)按原系统列序：装配采购|生产单号|款号|物料编号|物料名称|规格|材料|颜色|单位|数量|备注，
//   生产单号/款号/物料编号 为「输入框+🔍」点弹选择器；物料名称/规格/材料/单位 选物料后只读带出；无单价/金额。
// 非 usageCols(采购入仓/退仓)沿用原行为：物料合并链接、可选款号选订单、带单价/金额。
export default function MaterialLineTable({ value, onChange, hidePriceCols, enableOrderPicker, usageCols, 供应商 }: {
  value: DocLine[];
  onChange: Dispatch<SetStateAction<DocLine[]>>;
  hidePriceCols: boolean;
  enableOrderPicker?: boolean;
  usageCols?: boolean;
  供应商?: string;
}) {
  const setLine = (i: number, patch: Partial<DocLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const [pickFor, setPickFor] = useState<number | null>(null);         // 款号选订单(采购)
  const [matPickFor, setMatPickFor] = useState<number | null>(null);   // 物料选择器
  const [prodPickFor, setProdPickFor] = useState<number | null>(null); // 款号/生产单号选生产制单

  const fillFromOrder = (row: PurchaseOrderProgressRow) => {
    if (pickFor === null) return;
    setLine(pickFor, {
      订单单号: row.采购单号 ?? undefined,
      生产单号: row.生产单号 ?? undefined,
      款号: row.款号 ?? undefined,
      物料编号: row.物料编号 ?? undefined,
      物料名称: row.物料名称 ?? undefined,
      物料类别: row.物料类别 ?? undefined,
      规格: row.规格 ?? undefined,
      颜色: row.颜色 ?? undefined,
      单位: row.单位 ?? undefined,
      数量: Number(row.欠数 ?? 0),
    });
  };

  const fillFromProduction = (row: ProductionTrackingRow) => {
    if (prodPickFor === null) return;
    setLine(prodPickFor, productionLinePatch(row));
  };

  const fillFromMaterial = (row: MaterialRow) => {
    if (matPickFor === null) return;
    setLine(matPickFor, {
      物料编号: row.物料编号 ?? undefined,
      物料名称: row.物料名称 ?? undefined,
      物料类别: row.物料类别 ?? undefined,
      规格: row.规格 ?? undefined,
      颜色: row.颜色 ?? undefined,
      单位: row.单位 ?? undefined,
      单价: hidePriceCols ? null : (row.单价 ?? null),
    });
  };

  // 「输入框+🔍按钮」单元格：可手输，点放大镜弹选择器
  const pickCell = (val: string | undefined, onType: (s: string) => void, onPick: () => void, width: number) => (
    <Input style={{ width }} value={val ?? ""} onChange={e => onType(e.target.value)}
      suffix={<SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={onPick} />} />
  );
  const ro = (v?: string) => <span>{v ?? ""}</span>;

  const delOp = {
    title: "", key: "_op", width: 50,
    render: (_: unknown, __: DocLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a>,
  };
  const colColor = {
    title: "颜色", dataIndex: "颜色", width: 100,
    render: (_: unknown, r: DocLine, i: number) => (
      <Input style={{ width: 90 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} />
    ),
  };
  const colQty = {
    title: "数量", dataIndex: "数量", width: 100,
    render: (_: unknown, r: DocLine, i: number) => (
      <InputNumber min={0} precision={2} style={{ width: 88 }} value={r.数量 ?? 0}
        onChange={n => setLine(i, { 数量: Number(n ?? 0) })} />
    ),
  };

  // 领料/退料：按原系统列序
  const usageColumns = [
    {
      title: "装配采购", dataIndex: "装配采购", width: 92,
      render: () => <Input style={{ width: 80 }} disabled placeholder="—" />,
    },
    {
      title: "生产单号", dataIndex: "生产单号", width: 156,
      render: (_: unknown, r: DocLine, i: number) => pickCell(r.生产单号, s => setLine(i, { 生产单号: s }), () => setProdPickFor(i), 134),
    },
    {
      key: "款号_usage", title: "款号", dataIndex: "款号", width: 130,
      render: (_: unknown, r: DocLine, i: number) => pickCell(r.款号, s => setLine(i, { 款号: s }), () => setProdPickFor(i), 108),
    },
    {
      title: "物料编号", dataIndex: "物料编号", width: 144,
      render: (_: unknown, r: DocLine, i: number) => pickCell(r.物料编号, s => setLine(i, { 物料编号: s }), () => setMatPickFor(i), 122),
    },
    { title: "物料名称", dataIndex: "物料名称", width: 150, render: (v: string) => ro(v) },
    { title: "规格", dataIndex: "规格", width: 100, render: (v: string) => ro(v) },
    { title: "材料", dataIndex: "物料类别", width: 84, render: (v: string) => ro(v) },
    colColor,
    { title: "单位", dataIndex: "单位", width: 64, render: (v: string) => ro(v) },
    colQty,
    {
      title: "备注", dataIndex: "备注", width: 140,
      render: (_: unknown, r: DocLine, i: number) => (
        <Input style={{ width: 128 }} value={r.备注 ?? ""} onChange={e => setLine(i, { 备注: e.target.value })} />
      ),
    },
    delOp,
  ];

  // 采购入仓/退仓：沿用原行为
  const purchaseColumns = [
    ...(enableOrderPicker ? [{
      key: "款号_order", title: "款号", dataIndex: "款号", width: 130,
      render: (_: unknown, r: DocLine, i: number) => (
        <a onClick={() => setPickFor(i)}>{r.款号 ? r.款号 : "选订单"}</a>
      ),
    }] : []),
    {
      title: "物料", dataIndex: "物料编号", width: 220,
      render: (_: unknown, r: DocLine, i: number) => (
        <a onClick={() => setMatPickFor(i)}>
          {r.物料编号 ? `${r.物料编号} ${r.物料名称 ?? ""}` : "选物料"}
        </a>
      ),
    },
    { title: "规格", dataIndex: "规格", width: 110, render: (v: string) => v ?? "" },
    colColor,
    { title: "单位", dataIndex: "单位", width: 70, render: (v: string) => v ?? "" },
    colQty,
    ...(hidePriceCols ? [] : [
      {
        title: "单价", dataIndex: "单价", width: 110,
        render: (_: unknown, r: DocLine, i: number) => (
          <InputNumber min={0} precision={4} style={{ width: 96 }} value={r.单价 ?? 0}
            onChange={n => setLine(i, { 单价: Number(n ?? 0) })} />
        ),
      },
      { title: "金额", dataIndex: "_amt", width: 100, render: (_: unknown, r: DocLine) => lineAmount(r).toFixed(2) },
    ]),
    delOp,
  ];

  const columns = usageCols ? usageColumns : purchaseColumns;

  return (
    <div>
      <Table size="small" rowKey={(_: DocLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>
      <MaterialPicker
        open={matPickFor !== null} hidePriceCols={hidePriceCols}
        onPick={fillFromMaterial} onClose={() => setMatPickFor(null)}
      />
      {enableOrderPicker && (
        <OrderLinePicker
          open={pickFor !== null} 供应商={供应商}
          onPick={fillFromOrder} onClose={() => setPickFor(null)}
        />
      )}
      {usageCols && (
        <ProductionPicker
          open={prodPickFor !== null}
          onPick={fillFromProduction} onClose={() => setProdPickFor(null)}
        />
      )}
    </div>
  );
}
