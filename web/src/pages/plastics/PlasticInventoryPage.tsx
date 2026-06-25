import { useCallback, useEffect, useState } from "react";
import { Card, Input, Space, Table, message } from "antd";
import { plasticInventoryApi, type PlasticStockRow } from "../../api/plasticInventory";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "塑胶库存";
export default function PlasticInventoryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [仓库, set仓库] = useState("");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticStockRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await plasticInventoryApi.list(仓库.trim() || undefined, keyword.trim() || undefined)); }
    catch { message.error("加载塑胶库存失败"); }
    finally { setLoading(false); }
  }, [canOpen, 仓库, keyword]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "材料", dataIndex: "物料类别", width: 90 },
    { title: "仓位号", dataIndex: "仓位号", width: 90 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "仓库", dataIndex: "仓库", width: 100 },
    { title: "库存数量", dataIndex: "库存数量", width: 100, align: "right" as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶库存·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶库存统计表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Input placeholder="仓库" allowClear value={仓库} onChange={e => set仓库(e.target.value)} onPressEnter={load} style={{ width: 140 }} />
        <Input.Search placeholder="物料编号/名称/规格" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
