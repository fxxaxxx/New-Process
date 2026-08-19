// 按排期表(文件)分类视图:一张表 = 一个排期文件,展开可见该文件里的货号明细;
// 关键字可按 货号/品名/PO号/文件名 反查"哪些货号在哪些排期表"。
import { useCallback, useEffect, useState } from "react";
import { Input, Select, Space, Table, Tag, message } from "antd";
import { schedulingApi, type ScheduleFile, type ScheduleRow } from "../../api/scheduling";

const STATUS_COLOR: Record<string, string> = { 在排: "blue", 已走货: "green", 已取消: "red" };
const fmtDate = (v?: string) => v?.slice(0, 10) ?? "";

// 展开行:该排期表(批次)的货号明细;点货号可继续弹 BOM 物料下单
function BatchRows({ 批次ID, onPick货号 }: {
  批次ID: number;
  onPick货号?: (r: { 货号?: string; 数量?: number; 排期客户?: string; PO号?: string }) => void;
}) {
  const [rows, setRows] = useState<ScheduleRow[] | null>(null);
  useEffect(() => {
    schedulingApi.list({ 批次ID, page: 1, size: 1000 })
      .then(r => setRows(r.items))
      .catch(() => { message.error("加载排期明细失败"); setRows([]); });
  }, [批次ID]);
  const cols = [
    { title: "状态", dataIndex: "状态", width: 76,
      render: (v?: string) => v && <Tag color={STATUS_COLOR[v]} style={{ borderRadius: 6 }}>{v}</Tag> },
    { title: "货号", dataIndex: "货号", width: 130, ellipsis: true,
      render: (v: string | undefined, r: ScheduleRow) =>
        v ? <a className="erp-num" onClick={() => onPick货号?.(r)}>{v}</a> : "" },
    { title: "品名", dataIndex: "品名", width: 160, ellipsis: true },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" as const },
    { title: "走货期", dataIndex: "走货期", width: 100, render: fmtDate },
    { title: "客户名称", dataIndex: "客户名称", width: 160, ellipsis: true },
    { title: "PO号", dataIndex: "PO号", width: 130, ellipsis: true },
    { title: "工作表", dataIndex: "来源工作表", width: 90, ellipsis: true },
  ];
  return (
    <Table rowKey="ID" size="small" loading={rows === null} dataSource={rows ?? []} columns={cols}
      pagination={false} scroll={{ y: 320 }} />
  );
}

export default function ScheduleFilesView({ customers, onPick货号 }: {
  customers: string[];
  onPick货号?: (r: { 货号?: string; 数量?: number; 排期客户?: string; PO号?: string }) => void;
}) {
  const [rows, setRows] = useState<ScheduleFile[]>([]);
  const [排期客户, set排期客户] = useState<string>();
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    try { setRows(await schedulingApi.files(排期客户, keyword || undefined)); }
    catch { message.error("加载排期表分类失败"); }
  }, [排期客户, keyword]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "排期客户", dataIndex: "排期客户", width: 130 },
    { title: "排期表(文件名)", dataIndex: "文件名", ellipsis: true },
    { title: "行数", dataIndex: "行数", width: 80, align: "right" as const },
    { title: "货号数", dataIndex: "货号数", width: 80, align: "right" as const },
    {
      title: "状态分布", key: "_st", width: 220,
      render: (_: unknown, r: ScheduleFile) => (
        <Space size={4}>
          <Tag color="blue" style={{ borderRadius: 6 }}>在排 {r.在排}</Tag>
          <Tag color="green" style={{ borderRadius: 6 }}>已走货 {r.已走货}</Tag>
          <Tag color="red" style={{ borderRadius: 6 }}>已取消 {r.已取消}</Tag>
        </Space>
      ),
    },
    { title: "导入时间", dataIndex: "导入日期", width: 150, render: (v?: string) => v?.replace("T", " ").slice(0, 19) },
  ];

  return (
    <Space direction="vertical" size={8} style={{ width: "100%" }}>
      <Space wrap>
        <Select
          allowClear placeholder="排期客户" style={{ width: 160 }}
          value={排期客户} onChange={set排期客户}
          options={customers.map(c => ({ value: c, label: c }))}
        />
        <Input.Search
          placeholder="按 货号/品名/PO号/文件名 反查排期表" allowClear
          onSearch={setKeyword} style={{ width: 300 }}
        />
        <span style={{ color: "#888", fontSize: 12 }}>展开某张排期表可看里面的货号明细</span>
      </Space>
      <Table
        rowKey="ID" size="middle" dataSource={rows} columns={columns}
        scroll={{ y: "calc(100vh - 330px)" }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 张排期表` }}
        expandable={{ expandedRowRender: r => <BatchRows 批次ID={r.ID} onPick货号={onPick货号} /> }}
      />
    </Space>
  );
}
