import { InputNumber, Table } from "antd";
import { cellKey, type QtyMap } from "../utils/matrix";

// 行=颜色 列=尺码 的数量矩阵；value 的 key 用 cellKey(颜色,尺码)
export default function QtyMatrix({ 颜色s, 尺码s, value, onChange }: {
  颜色s: string[]; 尺码s: string[]; value: QtyMap; onChange: (v: QtyMap) => void;
}) {
  const columns = [
    { title: "颜色 \\ 尺码", dataIndex: "颜色", key: "颜色", fixed: "left" as const, width: 120 },
    ...尺码s.map(s => ({
      title: s, key: s, width: 90,
      render: (_: unknown, row: { 颜色: string }) => (
        <InputNumber min={0} precision={0} style={{ width: 76 }}
          value={value[cellKey(row.颜色, s)] ?? 0}
          onChange={n => onChange({ ...value, [cellKey(row.颜色, s)]: Number(n ?? 0) })} />
      ),
    })),
    {
      title: "小计", key: "_sum", width: 80,
      render: (_: unknown, row: { 颜色: string }) =>
        尺码s.reduce((a, s) => a + (value[cellKey(row.颜色, s)] ?? 0), 0),
    },
  ];
  return (
    <Table size="small" rowKey="颜色" pagination={false} scroll={{ x: true }}
      dataSource={颜色s.map(c => ({ 颜色: c }))} columns={columns} />
  );
}
