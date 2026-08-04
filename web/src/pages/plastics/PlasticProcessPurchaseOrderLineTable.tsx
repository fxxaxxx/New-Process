import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Select, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import PlasticMaterialPicker from "./PlasticMaterialPicker";
import ProductionPicker from "../materials/ProductionPicker";
import type { PlasticMaterialRow } from "../../api/plasticMaterialMaster";
import type { ProductionTrackingRow } from "../../api/productionReports";
import type { PPPOLine } from "../../api/plasticProcessPurchaseOrder";

// 塑胶加工采购单明细可编辑行(列序:生产单号🔍|款号|模具编号|物料编号🔍|物料名称只读|用料名称|颜色|加工内容|数量|单价|金额|备注|删除)。带价(单价/金额按 hidePrice 隐藏)。
export default function PlasticProcessPurchaseOrderLineTable({ value, onChange, readOnly, hidePrice }: {
  value: PPPOLine[];
  onChange: Dispatch<SetStateAction<PPPOLine[]>>;
  readOnly?: boolean;
  hidePrice?: boolean;
}) {
  const setLine = (i: number, patch: Partial<PPPOLine>) =>
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
  const ro = (v?: string | number | null) => <span>{v ?? ""}</span>;

  const columns: ColumnsType<PPPOLine> = [
    { title: "生产单号", dataIndex: "生产单号", width: 150, render: (_, r, i) => pickCell(r.生产单号, s => setLine(i, { 生产单号: s }), () => setProdPickFor(i), 128) },
    { title: "款号", dataIndex: "款号", width: 124, render: (_, r, i) => pickCell(r.款号, s => setLine(i, { 款号: s }), () => setProdPickFor(i), 102) },
    { title: "模具编号", dataIndex: "模具编号", width: 120, render: (_, r, i) => txt(r.模具编号, s => setLine(i, { 模具编号: s }), 106) },
    { title: "物料编号", dataIndex: "物料编号", width: 140, render: (_, r, i) => pickCell(r.物料编号, s => setLine(i, { 物料编号: s }), () => setMatPickFor(i), 118) },
    { title: "物料名称", dataIndex: "物料名称", width: 140, render: (v: string) => ro(v) },
    { title: "用料名称", dataIndex: "用料名称", width: 130, render: (_, r, i) => txt(r.用料名称, s => setLine(i, { 用料名称: s }), 118) },
    { title: "颜色", dataIndex: "颜色", width: 80, render: (_, r, i) => txt(r.颜色, s => setLine(i, { 颜色: s }), 68) },
    { title: "加工内容", dataIndex: "加工内容", width: 130, render: (_, r, i) => txt(r.加工内容, s => setLine(i, { 加工内容: s }), 118) },
    {
      title: "加工次序", dataIndex: "加工次序", width: 96,
      filters: [{ text: "第一次", value: "第一次" }, { text: "第二次", value: "第二次" }],
      onFilter: (v, r) => (r.加工次序 ?? "") === v,
      render: (_, r, i) => (
        <Select style={{ width: 84 }} allowClear disabled={readOnly} value={r.加工次序 ?? undefined}
          options={["第一次", "第二次"].map(v => ({ value: v, label: v }))}
          onChange={v => setLine(i, { 加工次序: v ?? undefined })} />
      ),
    },
    { title: "加工字母", dataIndex: "加工字母", width: 76, render: (_, r, i) => txt(r.加工字母, s => setLine(i, { 加工字母: s }), 56) },
    { title: "数量", dataIndex: "数量", width: 92, render: (_, r, i) => <InputNumber min={0} precision={2} style={{ width: 80 }} disabled={readOnly} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} /> },
    ...(hidePrice ? [] : [
      { title: "单价", dataIndex: "单价", width: 92, render: (_: unknown, r: PPPOLine, i: number) => <InputNumber min={0} precision={2} style={{ width: 80 }} disabled={readOnly} value={r.单价 ?? 0} onChange={n => setLine(i, { 单价: Number(n ?? 0) })} /> },
      { title: "金额", dataIndex: "金额", width: 100, align: "right" as const, render: (_: unknown, r: PPPOLine) => ro((Number(r.数量 ?? 0) * Number(r.单价 ?? 0)).toFixed(2)) },
    ]),
    { title: "备注", dataIndex: "备注", width: 130, render: (_, r, i) => txt(r.备注, s => setLine(i, { 备注: s }), 118) },
    ...(readOnly ? [] : [{ title: "", key: "_op", width: 50, render: (_: unknown, __: PPPOLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a> }]),
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: PPPOLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      {!readOnly && <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>}
      <PlasticMaterialPicker open={matPickFor !== null} onPick={fillFromMaterial} onClose={() => setMatPickFor(null)} />
      <ProductionPicker open={prodPickFor !== null} onPick={fillFromProduction} onClose={() => setProdPickFor(null)} />
    </div>
  );
}
