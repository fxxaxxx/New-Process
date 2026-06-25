import { useState, type Dispatch, type SetStateAction } from "react";
import { Button, Input, InputNumber, Table } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import PlasticMaterialPicker from "../PlasticMaterialPicker";
import type { PlasticMaterialRow } from "../../../api/plasticMaterialMaster";
import type { PlasticDocLine } from "../../../api/plasticDocs";

// 受控塑胶明细行表:物料编号点🔍弹 PlasticMaterialPicker(P0 塑胶物料资料)回填名称/规格/颜色/仓位号/单位。
export default function PlasticLineTable({ value, onChange, hidePriceCols }: {
  value: PlasticDocLine[];
  onChange: Dispatch<SetStateAction<PlasticDocLine[]>>;
  hidePriceCols: boolean;
}) {
  const [pickFor, setPickFor] = useState<number | null>(null);
  const setLine = (i: number, patch: Partial<PlasticDocLine>) =>
    onChange(prev => prev.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const fill = (row: PlasticMaterialRow) => {
    if (pickFor === null) return;
    setLine(pickFor, {
      物料编号: row.物料编号, 物料名称: row.物料名称, 规格: row.规格,
      颜色: row.颜色, 仓位号: row.仓位号, 单位: row.单位,
      单价: hidePriceCols ? null : (row.单价 ?? null),
    });
  };

  const ro = (v?: string) => <span>{v ?? ""}</span>;
  const columns = [
    {
      title: "物料", dataIndex: "物料编号", width: 200,
      render: (_: unknown, r: PlasticDocLine, i: number) => (
        <Input style={{ width: 180 }} value={r.物料编号 ?? ""} onChange={e => setLine(i, { 物料编号: e.target.value })}
          suffix={<SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setPickFor(i)} />} />
      ),
    },
    { title: "物料名称", dataIndex: "物料名称", width: 140, render: (v: string) => ro(v) },
    { title: "规格", dataIndex: "规格", width: 100, render: (v: string) => ro(v) },
    { title: "颜色", dataIndex: "颜色", width: 80, render: (v: string) => ro(v) },
    { title: "仓位号", dataIndex: "仓位号", width: 90, render: (v: string) => ro(v) },
    { title: "单位", dataIndex: "单位", width: 64, render: (v: string) => ro(v) },
    {
      title: "数量", dataIndex: "数量", width: 100,
      render: (_: unknown, r: PlasticDocLine, i: number) => (
        <InputNumber min={0} precision={2} style={{ width: 88 }} value={r.数量 ?? 0} onChange={n => setLine(i, { 数量: Number(n ?? 0) })} />
      ),
    },
    ...(hidePriceCols ? [] : [
      {
        title: "单价", dataIndex: "单价", width: 110,
        render: (_: unknown, r: PlasticDocLine, i: number) => (
          <InputNumber min={0} precision={4} style={{ width: 96 }} value={r.单价 ?? 0} onChange={n => setLine(i, { 单价: Number(n ?? 0) })} />
        ),
      },
      { title: "金额", dataIndex: "_amt", width: 100, render: (_: unknown, r: PlasticDocLine) => ((Number(r.数量) || 0) * (Number(r.单价) || 0)).toFixed(2) },
    ]),
    {
      title: "备注", dataIndex: "备注", width: 140,
      render: (_: unknown, r: PlasticDocLine, i: number) => (
        <Input style={{ width: 128 }} value={r.备注 ?? ""} onChange={e => setLine(i, { 备注: e.target.value })} />
      ),
    },
    { title: "", key: "_op", width: 50, render: (_: unknown, __: PlasticDocLine, i: number) => <a onClick={() => onChange(prev => prev.filter((_, j) => j !== i))}>删除</a> },
  ];

  return (
    <div>
      <Table size="small" rowKey={(_: PlasticDocLine, i?: number) => String(i)} pagination={false}
        dataSource={value} columns={columns} scroll={{ x: "max-content" }} />
      <Button icon={<PlusOutlined />} style={{ marginTop: 12 }} onClick={() => onChange(prev => [...prev, { 数量: 0 }])}>加一行</Button>
      <PlasticMaterialPicker open={pickFor !== null} onPick={fill} onClose={() => setPickFor(null)} />
    </div>
  );
}
