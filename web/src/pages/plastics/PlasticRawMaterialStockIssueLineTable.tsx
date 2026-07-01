import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, DatePicker, Input, InputNumber, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import PlasticRawMaterialPicker from "./PlasticRawMaterialPicker";
import type { PlasticRawMaterialRow } from "../../api/plasticRawMaterialMaster";
import type { RSILine } from "../../api/plasticRawMaterialStockIssue";

// 原料出库明细可编辑行:啤机生产单号|开单日期|啤机外发单号|原料编号🔍|原料名称只读|产地|每包重量|单位|数量|备注|删除。无价。
export default function PlasticRawMaterialStockIssueLineTable({ value, onChange, readOnly }: {
  value: RSILine[];
  onChange: Dispatch<SetStateAction<RSILine[]>>;
  readOnly?: boolean;
}) {
  const setLine = (i: number, patch: Partial<RSILine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const [matPickFor, setMatPickFor] = useState<number | null>(null);

  const fillFromMaterial = (row: PlasticRawMaterialRow) => {
    if (matPickFor === null) return;
    setLine(matPickFor, {
      原料编号: row.物料编号 ?? undefined, 原料名称: row.物料名称 ?? undefined,
      产地: row.产地 ?? undefined, 每包重量: row.每包重量 ?? undefined, 单位: row.单位 ?? undefined,
    });
  };

  const txt = (val: string | undefined, on: (s: string) => void, w: number) =>
    <Input style={{ width: w }} value={val ?? ""} disabled={readOnly} onChange={e => on(e.target.value)} />;
  const ro = (v?: string | number | null) => <span>{v ?? ""}</span>;

  const columns: ColumnsType<RSILine> = [
    { title: "啤机生产单号", dataIndex: "啤机生产单号", width: 140, render: (_, r, i) => txt(r.啤机生产单号, s => setLine(i, { 啤机生产单号: s }), 128) },
    { title: "开单日期", dataIndex: "开单日期", width: 130, render: (_, r, i) =>
      <DatePicker style={{ width: 118 }} disabled={readOnly} value={r.开单日期 ? dayjs(r.开单日期) : undefined}
        onChange={d => setLine(i, { 开单日期: d ? d.format("YYYY-MM-DD") : undefined })} /> },
    { title: "啤机外发单号", dataIndex: "啤机外发单号", width: 140, render: (_, r, i) => txt(r.啤机外发单号, s => setLine(i, { 啤机外发单号: s }), 128) },
    { title: "原料编号", dataIndex: "原料编号", width: 150, render: (_, r, i) =>
      <Input style={{ width: 128 }} value={r.原料编号 ?? ""} disabled={readOnly} onChange={e => setLine(i, { 原料编号: e.target.value })}
        suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setMatPickFor(i)} />} /> },
    { title: "原料名称", dataIndex: "原料名称", width: 150, render: (v: string) => ro(v) },
    { title: "产地", dataIndex: "产地", width: 100, render: (_, r, i) => txt(r.产地, s => setLine(i, { 产地: s }), 88) },
    { title: "每包重量", dataIndex: "每包重量", width: 100, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 88 }} disabled={readOnly} value={r.每包重量 ?? undefined} onChange={n => setLine(i, { 每包重量: n === null ? null : Number(n) })} /> },
    { title: "单位", dataIndex: "单位", width: 70, render: (_, r, i) => txt(r.单位, s => setLine(i, { 单位: s }), 58) },
    { title: "数量", dataIndex: "数量", width: 100, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 88 }} disabled={readOnly} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    { title: "备注", dataIndex: "备注", width: 130, render: (_, r, i) => txt(r.备注, s => setLine(i, { 备注: s }), 118) },
    ...(readOnly ? [] : [{ title: "", key: "_op", width: 50, render: (_: unknown, __: RSILine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a> }]),
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: RSILine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      {!readOnly && <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>}
      <PlasticRawMaterialPicker open={matPickFor !== null} onPick={fillFromMaterial} onClose={() => setMatPickFor(null)} />
    </div>
  );
}
