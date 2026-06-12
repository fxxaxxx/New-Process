import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Table } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { lineAmount, type DocLine } from "../../utils/materialLines";
import OrderLinePicker from "./OrderLinePicker";
import MaterialPicker from "./MaterialPicker";
import type { PurchaseOrderProgressRow } from "../../api/purchaseOrders";
import type { MaterialRow } from "../../api/materialMaster";

// 受控物料明细行编辑表；物料点击弹选择器带出名称/规格/单位/单价；可选款号选订单。
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

  const [pickFor, setPickFor] = useState<number | null>(null);       // 款号选订单
  const [matPickFor, setMatPickFor] = useState<number | null>(null); // 物料选择器

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

  const columns = [
    ...(usageCols ? [
      {
        title: "生产单号", dataIndex: "生产单号", width: 140,
        render: (_: unknown, r: DocLine, i: number) => (
          <Input style={{ width: 128 }} value={r.生产单号 ?? ""} onChange={e => setLine(i, { 生产单号: e.target.value })} />
        ),
      },
      {
        key: "款号_usage", title: "款号", dataIndex: "款号", width: 120,
        render: (_: unknown, r: DocLine, i: number) => (
          <Input style={{ width: 108 }} value={r.款号 ?? ""} onChange={e => setLine(i, { 款号: e.target.value })} />
        ),
      },
    ] : []),
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
    ...(usageCols ? [
      { title: "材料", dataIndex: "物料类别", width: 90, render: (v: string) => v ?? "" },
    ] : []),
    {
      title: "颜色", dataIndex: "颜色", width: 100,
      render: (_: unknown, r: DocLine, i: number) => (
        <Input style={{ width: 90 }} value={r.颜色 ?? ""} onChange={e => setLine(i, { 颜色: e.target.value })} />
      ),
    },
    { title: "单位", dataIndex: "单位", width: 70, render: (v: string) => v ?? "" },
    {
      title: "数量", dataIndex: "数量", width: 110,
      render: (_: unknown, r: DocLine, i: number) => (
        <InputNumber min={0} precision={2} style={{ width: 96 }} value={r.数量 ?? 0}
          onChange={n => setLine(i, { 数量: Number(n ?? 0) })} />
      ),
    },
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
    ...(usageCols ? [
      {
        title: "备注", dataIndex: "备注", width: 140,
        render: (_: unknown, r: DocLine, i: number) => (
          <Input style={{ width: 128 }} value={r.备注 ?? ""} onChange={e => setLine(i, { 备注: e.target.value })} />
        ),
      },
    ] : []),
    {
      title: "", key: "_op", width: 50,
      render: (_: unknown, __: DocLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a>,
    },
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: DocLine, i?: number) => String(i)} pagination={false} dataSource={value} columns={columns} />
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
    </div>
  );
}
