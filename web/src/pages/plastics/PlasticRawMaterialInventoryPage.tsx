import { useCallback, useEffect, useState } from "react";
import { Button, Card, Checkbox, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialApi, type PlasticRawMaterialInventoryRow } from "../../api/plasticRawMaterial";
import { plasticRawMaterialMasterApi, type PlasticRawMaterialCategoryNode } from "../../api/plasticRawMaterialMaster";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料库存统计表";

export default function PlasticRawMaterialInventoryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [cats, setCats] = useState<PlasticRawMaterialCategoryNode[]>([]);
  const [cat, setCat] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyStock, setOnlyStock] = useState(true);
  const [onlyZero, setOnlyZero] = useState(false);
  const [rows, setRows] = useState<PlasticRawMaterialInventoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canOpen) plasticRawMaterialMasterApi.categories().then(setCats).catch(() => { /* 取类别失败不阻塞 */ });
  }, [canOpen]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const mode = onlyZero ? "zero" : (onlyStock ? "stock" : "all");
      setRows(await plasticRawMaterialApi.inventory(cat || undefined, keyword || undefined, mode));
    } catch { message.error("加载原料库存统计表失败"); }
    finally { setLoading(false); }
  }, [canOpen, cat, keyword, onlyStock, onlyZero]);
  useEffect(() => { load(); }, [canOpen, cat, onlyStock, onlyZero]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnsType<PlasticRawMaterialInventoryRow> = [
    { title: "原料编号", dataIndex: "原料编号", width: 120 },
    { title: "原料名称", dataIndex: "原料名称", width: 180 },
    { title: "产地", dataIndex: "产地", width: 120 },
    { title: "每包重量", dataIndex: "每包重量", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "物料类别", dataIndex: "物料类别", width: 100 },
    { title: "库存数量", dataIndex: "库存数量", width: 110, align: "right" as const,
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
  ];

  const totalStock = rows.reduce((s, r) => s + Number(r.库存数量 ?? 0), 0);
  const exportCols: ExportCol[] = [
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "产地", key: "产地" },
    { title: "每包重量", key: "每包重量" },
    { title: "单位", key: "单位" },
    { title: "物料类别", key: "物料类别" },
    { title: "库存数量", key: "库存数量" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料库存统计表·打开"权限）。</div></Card>;
  }

  return (
    <Card title="原料库存统计表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={cat} onChange={setCat} style={{ width: 160 }}
          options={[{ value: "", label: "全部类别" }, ...cats.filter(x => x.类别).map(x => ({ value: x.类别!, label: `${x.类别}(${x.数量})` }))]} />
        <Input.Search placeholder="原料编号/名称/产地" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 240 }} />
        <Checkbox checked={onlyStock} disabled={onlyZero} onChange={e => setOnlyStock(e.target.checked)}>只显示库存数</Checkbox>
        <Checkbox checked={onlyZero} onChange={e => setOnlyZero(e.target.checked)}>零库存</Checkbox>
        <Button onClick={() => downloadCsv("原料库存统计表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料库存统计表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={6} align="right"><b>{totalStock}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )} />
    </Card>
  );
}
