import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import PlasticMaterialPicker from "./PlasticMaterialPicker";
import ProductionPicker from "../materials/ProductionPicker";
import type { PlasticMaterialRow } from "../../api/plasticMaterialMaster";
import type { ProductionTrackingRow } from "../../api/productionReports";
import type { PWRLine } from "../../api/plasticWarehouseReturn";

// 塑胶退仓明细可编辑行(保真列序:生产单号|款号|物料编号|物料名称|颜色|塑胶货号|单位|数量|单价|金额|备注)。
// 物料编号🔍=PlasticMaterialPicker;生产单号/款号🔍=ProductionPicker;塑胶货号手录。hidePrice 时隐藏 单价/金额。
export default function PlasticWarehouseReturnLineTable({ value, onChange, readOnly, hidePrice }: {
  value: PWRLine[];
  onChange: Dispatch<SetStateAction<PWRLine[]>>;
  readOnly?: boolean;
  hidePrice?: boolean;
}) {
  const setLine = (i: number, patch: Partial<PWRLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const [matPickFor, setMatPickFor] = useState<number | null>(null);
  const [prodPickFor, setProdPickFor] = useState<number | null>(null);

  const fillFromMaterial = (row: PlasticMaterialRow) => {
    if (matPickFor === null) return;
    setLine(matPickFor, {
      物料编号: row.物料编号 ?? undefined, 物料名称: row.物料名称 ?? undefined,
      规格: row.规格 ?? undefined, 颜色: row.颜色 ?? undefined,
      仓位号: row.仓位号 ?? undefined, 单位: row.单位 ?? undefined,
    });
  };
  const fillFromProduction = (row: ProductionTrackingRow) => {
    if (prodPickFor === null) return;
    setLine(prodPickFor, { 生产单号: row.生产单号 ?? undefined, 款号: row.款号 ?? undefined });
  };

  const txt = (val: string | undefined, on: (s: string) => void, w: number) =>
    <Input style={{ width: w }} value={val ?? ""} disabled={readOnly} onChange={e => on(e.target.value)} />;
  const pickCell = (val: string | undefined, on: (s: string) => void, onPick: () => void, w: number) =>
    <Input style={{ width: w }} value={val ?? ""} disabled={readOnly} onChange={e => on(e.target.value)}
      suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={onPick} />} />;
  const ro = (v?: string) => <span>{v ?? ""}</span>;
  const lineAmt = (r: PWRLine) => Number(r.数量 ?? 0) * Number(r.单价 ?? 0);

  const columns = [
    { title: "生产单号", dataIndex: "生产单号", width: 150, render: (_: unknown, r: PWRLine, i: number) => pickCell(r.生产单号, s => setLine(i, { 生产单号: s }), () => setProdPickFor(i), 128) },
    { title: "款号", dataIndex: "款号", width: 124, render: (_: unknown, r: PWRLine, i: number) => pickCell(r.款号, s => setLine(i, { 款号: s }), () => setProdPickFor(i), 102) },
    { title: "物料编号", dataIndex: "物料编号", width: 140, render: (_: unknown, r: PWRLine, i: number) => pickCell(r.物料编号, s => setLine(i, { 物料编号: s }), () => setMatPickFor(i), 118) },
    { title: "物料名称", dataIndex: "物料名称", width: 140, render: (v: string) => ro(v) },
    { title: "颜色", dataIndex: "颜色", width: 80, render: (_: unknown, r: PWRLine, i: number) => txt(r.颜色, s => setLine(i, { 颜色: s }), 68) },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 120, render: (_: unknown, r: PWRLine, i: number) => txt(r.塑胶货号, s => setLine(i, { 塑胶货号: s }), 108) },
    { title: "单位", dataIndex: "单位", width: 64, render: (v: string) => ro(v) },
    { title: "数量", dataIndex: "数量", width: 92, render: (_: unknown, r: PWRLine, i: number) => <InputNumber min={0} precision={2} style={{ width: 80 }} disabled={readOnly} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    ...(hidePrice ? [] : [
      { title: "单价", dataIndex: "单价", width: 100, render: (_: unknown, r: PWRLine, i: number) => <InputNumber min={0} precision={4} style={{ width: 88 }} disabled={readOnly} value={r.单价 ?? 0} onChange={n => setLine(i, { 单价: Number(n ?? 0) })} /> },
      { title: "金额", dataIndex: "_amt", width: 96, render: (_: unknown, r: PWRLine) => lineAmt(r).toFixed(2) },
    ]),
    { title: "备注", dataIndex: "备注", width: 130, render: (_: unknown, r: PWRLine, i: number) => txt(r.备注, s => setLine(i, { 备注: s }), 118) },
    ...(readOnly ? [] : [{ title: "", key: "_op", width: 50, render: (_: unknown, __: PWRLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a> }]),
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: PWRLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      {!readOnly && <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>}
      <PlasticMaterialPicker open={matPickFor !== null} onPick={fillFromMaterial} onClose={() => setMatPickFor(null)} />
      <ProductionPicker open={prodPickFor !== null} onPick={fillFromProduction} onClose={() => setProdPickFor(null)} />
    </div>
  );
}
