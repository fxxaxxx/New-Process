import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import PlasticRawMaterialPicker from "./PlasticRawMaterialPicker";
import type { PlasticRawMaterialRow } from "../../api/plasticRawMaterialMaster";
import type { RSTLine } from "../../api/plasticRawMaterialStocktake";

// 原料盘点明细可编辑行:原料编号🔍|原料名称只读|产地|每包重量|单位|系统数量只读|盘点数量|盈亏数量只读(=盘点−系统)|备注|删除。无价。
export default function PlasticRawMaterialStocktakeLineTable({ value, onChange, readOnly }: {
  value: RSTLine[];
  onChange: Dispatch<SetStateAction<RSTLine[]>>;
  readOnly?: boolean;
}) {
  const setLine = (i: number, patch: Partial<RSTLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const [matPickFor, setMatPickFor] = useState<number | null>(null);

  const fillFromMaterial = (row: PlasticRawMaterialRow) => {
    if (matPickFor === null) return;
    setLine(matPickFor, {
      原料编号: row.物料编号 ?? undefined, 原料名称: row.物料名称 ?? undefined,
      产地: row.产地 ?? undefined, 每包重量: row.每包重量 ?? undefined, 单位: row.单位 ?? undefined,
      系统数量: Number(row.库存 ?? 0),
    });
  };

  const txt = (val: string | undefined, on: (s: string) => void, w: number) =>
    <Input style={{ width: w }} value={val ?? ""} disabled={readOnly} onChange={e => on(e.target.value)} />;
  const ro = (v?: string | number | null) => <span>{v ?? ""}</span>;
  const diff = (r: RSTLine) => Number(r.盘点数量 ?? 0) - Number(r.系统数量 ?? 0);

  const columns: ColumnsType<RSTLine> = [
    { title: "原料编号", dataIndex: "原料编号", width: 150, render: (_, r, i) =>
      <Input style={{ width: 128 }} value={r.原料编号 ?? ""} disabled={readOnly} onChange={e => setLine(i, { 原料编号: e.target.value })}
        suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setMatPickFor(i)} />} /> },
    { title: "原料名称", dataIndex: "原料名称", width: 150, render: (v: string) => ro(v) },
    { title: "产地", dataIndex: "产地", width: 100, render: (_, r, i) => txt(r.产地, s => setLine(i, { 产地: s }), 88) },
    { title: "每包重量", dataIndex: "每包重量", width: 90, render: (v?: number | null) => ro(v) },
    { title: "单位", dataIndex: "单位", width: 70, render: (v: string) => ro(v) },
    { title: "系统数量", dataIndex: "系统数量", width: 100, align: "right" as const, render: (v?: number | null) => ro(v) },
    { title: "盘点数量", dataIndex: "盘点数量", width: 110, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 96 }} disabled={readOnly} value={r.盘点数量 ?? 0} onChange={n => setLine(i, { 盘点数量: Number(n ?? 0) })} /> },
    { title: "盈亏数量", dataIndex: "_diff", width: 100, align: "right" as const, render: (_: unknown, r: RSTLine) => diff(r).toFixed(2) },
    { title: "备注", dataIndex: "备注", width: 130, render: (_, r, i) => txt(r.备注, s => setLine(i, { 备注: s }), 118) },
    ...(readOnly ? [] : [{ title: "", key: "_op", width: 50, render: (_: unknown, __: RSTLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a> }]),
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: RSTLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      {!readOnly && <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 系统数量: 0, 盘点数量: 0 }])}>加一行</Button>}
      <PlasticRawMaterialPicker open={matPickFor !== null} onPick={fillFromMaterial} onClose={() => setMatPickFor(null)} />
    </div>
  );
}
