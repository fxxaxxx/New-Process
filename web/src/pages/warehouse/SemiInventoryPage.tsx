import { useCallback, useEffect, useState } from "react";
import { Card, Input, Table, message } from "antd";
import { semiInventoryApi, type SemiStockRow } from "../../api/semi";

export default function SemiInventoryPage() {
  const [rows, setRows] = useState<SemiStockRow[]>([]);
  const [仓库, set仓库] = useState("");

  const load = useCallback(async () => {
    if (!仓库) { setRows([]); return; }
    try { setRows(await semiInventoryApi.list(仓库)); }
    catch { message.error("加载半成品库存失败"); }
  }, [仓库]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" },
    { title: "颜色", dataIndex: "颜色" },
    { title: "库存", dataIndex: "库存",
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
  ];

  return (
    <Card title="半成品库存" variant="borderless"
      extra={<Input.Search placeholder="输入仓库查询" allowClear onSearch={set仓库} style={{ width: 220 }} />}>
      <Table rowKey={r => `${r.物料编号}|${r.颜色}`} size="middle" dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
