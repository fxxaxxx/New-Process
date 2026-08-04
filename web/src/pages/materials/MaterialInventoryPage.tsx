import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Input, Space, Table, Tree, message } from "antd";
import { materialInventoryApi, type MaterialStockRow } from "../../api/materialInventory";
import { materialMasterApi, type MaterialCategoryNode } from "../../api/materialMaster";

const ALL = "__ALL__";

export default function MaterialInventoryPage() {
  const [rows, setRows] = useState<MaterialStockRow[]>([]);
  const [cats, setCats] = useState<MaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [仓库, set仓库] = useState("");
  const [keyword, setKeyword] = useState("");

  const 类别 = selKey === ALL ? undefined : selKey;

  const load = useCallback(async () => {
    try { setRows(await materialInventoryApi.list(仓库 || undefined, keyword || undefined, 类别)); }
    catch { message.error("加载物料库存失败"); }
  }, [仓库, keyword, 类别]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    materialMasterApi.categories().then(setCats).catch(() => { /* 树取数失败不阻塞主表 */ });
  }, []);

  const treeData = useMemo(() => [{
    title: "全部物料", key: ALL,
    children: cats.map(c => ({ title: `${c.类别}（${c.数量}）`, key: c.类别 ?? "", isLeaf: true })),
  }], [cats]);

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "货号", dataIndex: "货号" },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" },
    { title: "材料", dataIndex: "物料类别" },
    { title: "单位", dataIndex: "单位" },
    { title: "仓库", dataIndex: "仓库" },
    {
      title: "库存数量", dataIndex: "库存数量",
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span>,
    },
  ];

  return (
    <Card title="库存统计表" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      <div style={{ width: 220, flex: "0 0 220px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        <Tree treeData={treeData} selectedKeys={[selKey]} defaultExpandAll
          onSelect={keys => { if (keys.length) setSelKey(String(keys[0])); }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input placeholder="仓库" allowClear value={仓库} onChange={e => set仓库(e.target.value)} style={{ width: 140 }} />
          <Input.Search placeholder="物料编号/名称" allowClear onSearch={setKeyword} style={{ width: 220 }} />
        </Space>
        <Table rowKey={r => `${r.物料编号}|${r.仓库}`} size="small" dataSource={rows} columns={columns}
          scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
      </div>
    </Card>
  );
}
