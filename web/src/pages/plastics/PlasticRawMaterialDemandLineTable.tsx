import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import PlasticRawMaterialPicker from "./PlasticRawMaterialPicker";
import type { PlasticRawMaterialRow } from "../../api/plasticRawMaterialMaster";
import type { RMDLine } from "../../api/plasticRawMaterialDemand";

// 原料生产需求明细可编辑行:原料编号🔍|原料名称只读|每包重量|单位|需求数量KG|需求数量包|备注|删除。
export default function PlasticRawMaterialDemandLineTable({ value, onChange, readOnly }: {
  value: RMDLine[];
  onChange: Dispatch<SetStateAction<RMDLine[]>>;
  readOnly?: boolean;
}) {
  const setLine = (i: number, patch: Partial<RMDLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const [matPickFor, setMatPickFor] = useState<number | null>(null);

  const fillFromMaterial = (row: PlasticRawMaterialRow) => {
    if (matPickFor === null) return;
    setLine(matPickFor, {
      原料编号: row.物料编号 ?? undefined, 原料名称: row.物料名称 ?? undefined, 单位: row.单位 ?? undefined,
    });
  };

  const txt = (val: string | undefined, on: (s: string) => void, w: number) =>
    <Input style={{ width: w }} value={val ?? ""} disabled={readOnly} onChange={e => on(e.target.value)} />;
  const ro = (v?: string | number | null) => <span>{v ?? ""}</span>;

  const columns: ColumnsType<RMDLine> = [
    { title: "原料编号", dataIndex: "原料编号", width: 150, render: (_, r, i) =>
      <Input style={{ width: 128 }} value={r.原料编号 ?? ""} disabled={readOnly} onChange={e => setLine(i, { 原料编号: e.target.value })}
        suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setMatPickFor(i)} />} /> },
    { title: "原料名称", dataIndex: "原料名称", width: 150, render: (v: string) => ro(v) },
    { title: "每包重量", dataIndex: "每包重量", width: 100, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 88 }} disabled={readOnly} value={r.每包重量 ?? 0} onChange={n => setLine(i, { 每包重量: Number(n ?? 0) })} /> },
    { title: "单位", dataIndex: "单位", width: 80, render: (_, r, i) => txt(r.单位, s => setLine(i, { 单位: s }), 68) },
    { title: "需求数量(KG)", dataIndex: "需求数量KG", width: 120, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 100 }} disabled={readOnly} value={r.需求数量KG ?? 0} onChange={n => setLine(i, { 需求数量KG: Number(n ?? 0) })} /> },
    { title: "需求数量(包)", dataIndex: "需求数量包", width: 120, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 100 }} disabled={readOnly} value={r.需求数量包 ?? 0} onChange={n => setLine(i, { 需求数量包: Number(n ?? 0) })} /> },
    { title: "备注", dataIndex: "备注", width: 140, render: (_, r, i) => txt(r.备注, s => setLine(i, { 备注: s }), 126) },
    ...(readOnly ? [] : [{ title: "", key: "_op", width: 50, render: (_: unknown, __: RMDLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a> }]),
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: RMDLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      {!readOnly && <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 需求数量KG: 0, 需求数量包: 0 }])}>加一行</Button>}
      <PlasticRawMaterialPicker open={matPickFor !== null} onPick={fillFromMaterial} onClose={() => setMatPickFor(null)} />
    </div>
  );
}
