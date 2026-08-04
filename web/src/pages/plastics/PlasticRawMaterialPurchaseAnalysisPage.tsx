import { useCallback, useEffect, useState } from "react";
import { Button, Card, Checkbox, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialPurchaseAnalysisApi, type PlasticRawMaterialPurchaseRow } from "../../api/plasticRawMaterialPurchaseAnalysis";
import { plasticRawMaterialMasterApi, type PlasticRawMaterialCategoryNode } from "../../api/plasticRawMaterialMaster";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料采购分析表";

export default function PlasticRawMaterialPurchaseAnalysisPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [cats, setCats] = useState<PlasticRawMaterialCategoryNode[]>([]);
  const [cat, setCat] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyBuy, setOnlyBuy] = useState(false);
  const [rows, setRows] = useState<PlasticRawMaterialPurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canOpen) plasticRawMaterialMasterApi.categories().then(setCats).catch(() => { /* 取类别失败不阻塞 */ });
  }, [canOpen]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticRawMaterialPurchaseAnalysisApi.list({
        物料类别: cat || undefined, keyword: keyword || undefined, onlyBuy,
      }));
    } catch { message.error("加载原料采购分析表失败"); }
    finally { setLoading(false); }
  }, [canOpen, cat, keyword, onlyBuy]);
  useEffect(() => { load(); }, [canOpen, cat, onlyBuy]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns: ColumnsType<PlasticRawMaterialPurchaseRow> = [
    { title: "原料编号", dataIndex: "原料编号", width: 120 },
    { title: "原料名称", dataIndex: "原料名称", width: 160 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "物料类别", dataIndex: "物料类别", width: 100 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "当前库存", dataIndex: "当前库存", width: 100, align: "right" as const },
    { title: "安全库存", dataIndex: "安全库存", width: 100, align: "right" as const },
    { title: "生产需求(KG)", dataIndex: "生产需求", width: 120, align: "right" as const },
    { title: "可购数量", dataIndex: "可购数量", width: 110, align: "right" as const,
      render: (v?: number | null) => <span style={{ color: Number(v) > 0 ? "#cf1322" : undefined }}>{v ?? ""}</span> },
  ];

  const exportCols: ExportCol[] = [
    { title: "原料编号", key: "原料编号" }, { title: "原料名称", key: "原料名称" }, { title: "规格", key: "规格" },
    { title: "物料类别", key: "物料类别" }, { title: "单位", key: "单位" },
    { title: "当前库存", key: "当前库存" }, { title: "安全库存", key: "安全库存" },
    { title: "生产需求(KG)", key: "生产需求" }, { title: "可购数量", key: "可购数量" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料采购分析表·打开"权限）。</div></Card>;
  }

  return (
    <Card title="原料采购分析表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={cat} onChange={setCat} style={{ width: 160 }}
          options={[{ value: "", label: "全部类别" }, ...cats.filter(x => x.类别).map(x => ({ value: x.类别!, label: `${x.类别}(${x.数量})` }))]} />
        <Input.Search placeholder="原料编号/名称" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 220 }} />
        <Checkbox checked={onlyBuy} onChange={e => setOnlyBuy(e.target.checked)}>只看可购</Checkbox>
        <Button onClick={() => downloadCsv("原料采购分析表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料采购分析表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
