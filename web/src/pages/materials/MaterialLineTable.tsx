import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { Button, Input, InputNumber, Select, Table } from "antd";
import OrderLinePicker from "./OrderLinePicker";
import type { PurchaseOrderProgressRow } from "../../api/purchaseOrders";
import { PlusOutlined } from "@ant-design/icons";
import { lineAmount, type DocLine } from "../../utils/materialLines";

type MaterialOption = Record<string, unknown>;

// 受控物料明细行编辑表；物料编号选择后带出名称/规格/单位/单价
export default function MaterialLineTable({ materials, value, onChange, hidePriceCols, enableOrderPicker, 供应商 }: {
  materials: MaterialOption[];
  value: DocLine[];
  onChange: Dispatch<SetStateAction<DocLine[]>>;
  hidePriceCols: boolean;
  enableOrderPicker?: boolean;
  供应商?: string;
}) {
  const setLine = (i: number, patch: Partial<DocLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const [pickFor, setPickFor] = useState<number | null>(null);

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

  const pickMaterial = (i: number, 物料编号: string) => {
    const m = materials.find(x => String(x.物料编号) === 物料编号);
    setLine(i, {
      物料编号,
      物料名称: m?.物料名称 as string | undefined,
      物料类别: m?.物料类别 as string | undefined,
      规格: m?.规格 as string | undefined,
      单位: m?.单位 as string | undefined,
      单价: hidePriceCols ? null : ((m?.单价 as number | undefined) ?? null),
    });
  };

  const columns = [
    ...(enableOrderPicker ? [{
      title: "款号", dataIndex: "款号", width: 130,
      render: (_: unknown, r: DocLine, i: number) => (
        <a onClick={() => setPickFor(i)}>{r.款号 ? r.款号 : "选订单"}</a>
      ),
    }] : []),
    {
      title: "物料", dataIndex: "物料编号", width: 220,
      render: (_: unknown, r: DocLine, i: number) => (
        <Select showSearch optionFilterProp="label" style={{ width: 200 }} value={r.物料编号 || undefined}
          placeholder="选择物料" onChange={(v: string) => pickMaterial(i, v)}
          options={materials.map(m => ({ value: String(m.物料编号), label: `${m.物料编号} ${m.物料名称 ?? ""}` }))} />
      ),
    },
    { title: "规格", dataIndex: "规格", width: 110, render: (v: string) => v ?? "" },
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
    {
      title: "", key: "_op", width: 50,
      render: (_: unknown, __: DocLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a>,
    },
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: DocLine, i?: number) => String(i)} pagination={false} dataSource={value} columns={columns} />
      <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>
      {enableOrderPicker && (
        <OrderLinePicker
          open={pickFor !== null}
          供应商={供应商}
          onPick={fillFromOrder}
          onClose={() => setPickFor(null)}
        />
      )}
    </div>
  );
}
