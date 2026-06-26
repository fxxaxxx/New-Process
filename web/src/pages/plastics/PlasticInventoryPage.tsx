import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Space, Table, Tree, message } from "antd";
import { plasticInventoryApi, type PlasticStockRow } from "../../api/plasticInventory";
import { plasticMaterialMasterApi, type PlasticMaterialCategoryNode } from "../../api/plasticMaterialMaster";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "塑胶库存";
const ALL = "__ALL__";

export default function PlasticInventoryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [rows, setRows] = useState<PlasticStockRow[]>([]);
  const [cats, setCats] = useState<PlasticMaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [仓库, set仓库] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const 类别 = selKey === ALL ? undefined : selKey;

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try { setRows(await plasticInventoryApi.list(仓库 || undefined, keyword || undefined, 类别)); }
    catch { message.error("加载塑胶库存失败"); }
    finally { setLoading(false); }
  }, [canOpen, 仓库, keyword, 类别]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (canOpen) plasticMaterialMasterApi.categories().then(setCats).catch(() => { /* 树取数失败不阻塞主表 */ });
  }, [canOpen]);

  const treeData = useMemo(() => [{
    title: "全部物料", key: ALL,
    children: cats.map(c => ({ title: `${c.类别}（${c.数量}）`, key: c.类别 ?? "", isLeaf: true })),
  }], [cats]);

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120, render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "工模编号", dataIndex: "工模编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "材料", dataIndex: "物料类别", width: 90 },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 110 },
    { title: "仓位号", dataIndex: "仓位号", width: 90 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "仓库", dataIndex: "仓库", width: 100 },
    { title: "库存数量", dataIndex: "库存数量", width: 100, align: "right" as const,
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: (v?: number | null) => (v == null ? "" : Number(v).toFixed(2)) },
    ]),
  ];

  const 库存合计 = rows.reduce((s, r) => s + Number(r.库存数量 ?? 0), 0);
  const 金额合计 = rows.reduce((s, r) => s + Number(r.金额 ?? 0), 0);

  const exportCols: ExportCol[] = [
    { title: "物料编号", key: "物料编号" }, { title: "工模编号", key: "工模编号" }, { title: "物料名称", key: "物料名称" },
    { title: "规格", key: "规格" }, { title: "颜色", key: "颜色" }, { title: "材料", key: "物料类别" },
    { title: "塑胶货号", key: "塑胶货号" }, { title: "仓位号", key: "仓位号" }, { title: "单位", key: "单位" },
    { title: "仓库", key: "仓库" }, { title: "库存数量", key: "库存数量" },
    ...(priceHidden ? [] : [{ title: "单价", key: "单价" }, { title: "金额", key: "金额" }]),
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶库存·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶库存统计表" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      <div style={{ width: 200, flex: "0 0 200px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        <Tree treeData={treeData} selectedKeys={[selKey]} defaultExpandAll
          onSelect={keys => { if (keys.length) setSelKey(String(keys[0])); }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input placeholder="仓库" allowClear value={仓库} onChange={e => set仓库(e.target.value)} onPressEnter={load} style={{ width: 140 }} />
          <Input.Search placeholder="物料编号/名称/规格" allowClear value={keyword}
            onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
          <Button onClick={() => downloadCsv("塑胶库存统计表.csv", exportCols, asRecords())}>导出EXCEL</Button>
          <Button onClick={() => printTable("塑胶库存统计表", exportCols, asRecords())}>打印</Button>
        </Space>
        <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
          scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
          summary={() => (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={10}><b>合计</b></Table.Summary.Cell>
                <Table.Summary.Cell index={10} align="right"><b>{库存合计}</b></Table.Summary.Cell>
                {!priceHidden && <Table.Summary.Cell index={11} />}
                {!priceHidden && <Table.Summary.Cell index={12} align="right"><b>{金额合计.toFixed(2)}</b></Table.Summary.Cell>}
              </Table.Summary.Row>
            </Table.Summary>
          )} />
      </div>
    </Card>
  );
}
