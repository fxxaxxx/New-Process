import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import PlasticMaterialPicker from "./PlasticMaterialPicker";
import ProductionPicker from "../materials/ProductionPicker";
import type { PlasticMaterialRow } from "../../api/plasticMaterialMaster";
import type { ProductionTrackingRow } from "../../api/productionReports";
import type { PPOLine } from "../../api/plasticPurchaseOrder";

// 塑胶采购订单明细可编辑行(列序:生产单号🔍|款号|物料编号🔍|物料名称只读|模具编号|用量|套数|数量|颜色|色粉号|用料名称|备注|删除)。无价格列。
export default function PlasticPurchaseOrderLineTable({ value, onChange, readOnly }: {
  value: PPOLine[];
  onChange: Dispatch<SetStateAction<PPOLine[]>>;
  readOnly?: boolean;
}) {
  const setLine = (i: number, patch: Partial<PPOLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const [matPickFor, setMatPickFor] = useState<number | null>(null);
  const [prodPickFor, setProdPickFor] = useState<number | null>(null);

  const fillFromMaterial = (row: PlasticMaterialRow) => {
    if (matPickFor === null) return;
    setLine(matPickFor, {
      物料编号: row.物料编号 ?? undefined, 物料名称: row.物料名称 ?? undefined,
      颜色: row.颜色 ?? undefined,
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
  const numCell = (val: number | null | undefined, on: (n: number) => void) =>
    <InputNumber min={0} precision={2} style={{ width: 80 }} disabled={readOnly} value={val ?? 0} onChange={n => on(Number(n ?? 0))} />;

  const columns: ColumnsType<PPOLine> = [
    { title: "生产单号", dataIndex: "生产单号", width: 150, render: (_, r, i) => pickCell(r.生产单号, s => setLine(i, { 生产单号: s }), () => setProdPickFor(i), 128) },
    { title: "款号", dataIndex: "款号", width: 124, render: (_, r, i) => pickCell(r.款号, s => setLine(i, { 款号: s }), () => setProdPickFor(i), 102) },
    { title: "物料编号", dataIndex: "物料编号", width: 140, render: (_, r, i) => pickCell(r.物料编号, s => setLine(i, { 物料编号: s }), () => setMatPickFor(i), 118) },
    { title: "物料名称", dataIndex: "物料名称", width: 140, render: (v: string) => ro(v) },
    { title: "模具编号", dataIndex: "模具编号", width: 120, render: (_, r, i) => txt(r.模具编号, s => setLine(i, { 模具编号: s }), 106) },
    { title: "用量", dataIndex: "用量", width: 92, render: (_, r, i) => numCell(r.用量, n => setLine(i, { 用量: n })) },
    { title: "套数", dataIndex: "套数", width: 92, render: (_, r, i) => numCell(r.套数, n => setLine(i, { 套数: n })) },
    { title: "数量", dataIndex: "数量", width: 92, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 80 }} disabled={readOnly} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    { title: "颜色", dataIndex: "颜色", width: 110, render: (_, r, i) => txt(r.颜色, s => setLine(i, { 颜色: s }), 68) },
    { title: "色粉号", dataIndex: "色粉号", width: 110, render: (_, r, i) => txt(r.色粉号, s => setLine(i, { 色粉号: s }), 98) },
    { title: "用料名称", dataIndex: "用料名称", width: 130, render: (_, r, i) => txt(r.用料名称, s => setLine(i, { 用料名称: s }), 118) },
    { title: "备注", dataIndex: "备注", width: 130, render: (_, r, i) => txt(r.备注, s => setLine(i, { 备注: s }), 118) },
    // 收货进度(仅打开已有单据时后端带出;新建录入行留空)
    { title: "已入仓", dataIndex: "入仓数量", width: 90, align: "right" as const,
      render: (v?: number | null) => (v == null ? "" : v) },
    { title: "欠数", key: "_owed", width: 100, align: "right" as const,
      render: (_: unknown, r: PPOLine) => {
        if (r.欠数 == null) return "";
        const 欠 = r.欠数;
        if (欠 > 0) return <b style={{ color: "#cf1322" }}>欠 {欠}</b>;
        if (欠 < 0) return <b style={{ color: "#fa8c16" }}>超收 {Math.abs(欠)}</b>;
        return <b style={{ color: "#52c41a" }}>已完成</b>;
      } },
    ...(readOnly ? [] : [{ title: "", key: "_op", width: 50, render: (_: unknown, __: PPOLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a> }]),
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: PPOLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      {!readOnly && <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>}
      <PlasticMaterialPicker open={matPickFor !== null} onPick={fillFromMaterial} onClose={() => setMatPickFor(null)} />
      <ProductionPicker open={prodPickFor !== null} onPick={fillFromProduction} onClose={() => setProdPickFor(null)} />
    </div>
  );
}
