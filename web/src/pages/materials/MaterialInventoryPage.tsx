import { useCallback, useEffect, useState } from "react";
import { Card, Input, Space, Table, message } from "antd";
import { materialInventoryApi, type MaterialStockRow } from "../../api/materialInventory";

export default function MaterialInventoryPage() {
  const [rows, setRows] = useState<MaterialStockRow[]>([]);
  const [仓库, set仓库] = useState("");
  const [keyword, setKeyword] = useState("");

  const load = useCallback(async () => {
    try { setRows(await materialInventoryApi.list(仓库 || undefined, keyword || undefined)); }
    catch { message.error("加载物料库存失败"); }
  }, [仓库, keyword]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" },
    { title: "单位", dataIndex: "单位" },
    { title: "仓库", dataIndex: "仓库" },
    {
      title: "库存数量", dataIndex: "库存数量",
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span>,
    },
  ];

  return (
    <Card title="物料库存" variant="borderless"
      extra={
        <Space>
          <Input placeholder="仓库" allowClear value={仓库} onChange={e => set仓库(e.target.value)} style={{ width: 140 }} />
          <Input.Search placeholder="物料编号/名称" allowClear onSearch={setKeyword} style={{ width: 220 }} />
        </Space>
      }>
      <Table rowKey={r => `${r.物料编号}|${r.仓库}`} size="middle" dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
