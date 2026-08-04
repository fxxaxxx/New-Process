import { useCallback, useEffect, useState } from "react";
import { Card, Input, Table, message } from "antd";
import { finishedInventoryApi, type FinishedStockRow } from "../../api/finished";

export default function FinishedInventoryPage() {
  const [rows, setRows] = useState<FinishedStockRow[]>([]);
  const [仓库, set仓库] = useState("");

  const load = useCallback(async () => {
    if (!仓库) { setRows([]); return; }
    try { setRows(await finishedInventoryApi.list(仓库)); }
    catch { message.error("加载成品库存失败"); }
  }, [仓库]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "款号", dataIndex: "款号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "款式", dataIndex: "款式" },
    { title: "颜色", dataIndex: "颜色" },
    { title: "尺码", dataIndex: "尺码" },
    { title: "库存", dataIndex: "库存",
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
  ];

  return (
    <Card title="成品库存" variant="borderless"
      extra={<Input.Search placeholder="输入仓库查询" allowClear onSearch={set仓库} style={{ width: 220 }} />}>
      <Table rowKey={r => `${r.款号}|${r.色号}|${r.颜色}|${r.尺码}`} size="middle" dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} />
    </Card>
  );
}
