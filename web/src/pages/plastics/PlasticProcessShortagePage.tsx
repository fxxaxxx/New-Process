import { useCallback, useEffect, useState } from "react";
import { Button, Card, Checkbox, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { plasticProcessShortageApi, type PlasticProcessShortageRow } from "../../api/plasticProcessShortage";
import { plasticMaterialMasterApi, type PlasticMaterialCategoryNode } from "../../api/plasticMaterialMaster";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "物料发外欠数表";

export default function PlasticProcessShortagePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [cats, setCats] = useState<PlasticMaterialCategoryNode[]>([]);
  const [cat, setCat] = useState("");
  const [appr, setAppr] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyOwed, setOnlyOwed] = useState(false);
  const [rows, setRows] = useState<PlasticProcessShortageRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (canOpen) plasticMaterialMasterApi.categories().then(setCats).catch(() => { /* 取类别失败不阻塞 */ });
  }, [canOpen]);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticProcessShortageApi.list({
        物料类别: cat || undefined,
        审核情况: appr || undefined,
        keyword: keyword || undefined,
        onlyOwed,
      }));
    } catch { message.error("加载物料发外欠数表失败"); }
    finally { setLoading(false); }
  }, [canOpen, cat, appr, keyword, onlyOwed]);

  useEffect(() => { load(); }, [canOpen, cat, appr, onlyOwed]); // eslint-disable-line react-hooks/exhaustive-deps

  const priceCols: ColumnsType<PlasticProcessShortageRow> = priceHidden ? [] : [
    { title: "单价", dataIndex: "单价", width: 90, align: "right" as const },
    { title: "金额", dataIndex: "金额", width: 110, align: "right" as const },
  ];

  const columns: ColumnsType<PlasticProcessShortageRow> = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "共用物料编号", dataIndex: "共用物料编号", width: 130 },
    { title: "物料名称", dataIndex: "物料名称", width: 160 },
    { title: "模具编号", dataIndex: "模具编号", width: 110 },
    { title: "共用物料", dataIndex: "共用物料", width: 140 },
    { title: "物料类别", dataIndex: "物料类别", width: 100 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "欠数", dataIndex: "欠数", width: 100, align: "right" as const },
    ...priceCols,
  ];

  const exportCols: ExportCol[] = [
    { title: "物料编号", key: "物料编号" },
    { title: "共用物料编号", key: "共用物料编号" },
    { title: "物料名称", key: "物料名称" },
    { title: "模具编号", key: "模具编号" },
    { title: "共用物料", key: "共用物料" },
    { title: "物料类别", key: "物料类别" },
    { title: "单位", key: "单位" },
    { title: "欠数", key: "欠数" },
    ...(priceHidden ? [] : [{ title: "单价", key: "单价" }, { title: "金额", key: "金额" }]),
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"物料发外欠数表·打开"权限）。</div></Card>;
  }

  return (
    <Card title="物料发外欠数表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={cat} onChange={setCat} style={{ width: 160 }}
          options={[{ value: "", label: "全部类别" }, ...cats.filter(x => x.类别).map(x => ({ value: x.类别!, label: `${x.类别}(${x.数量})` }))]} />
        <Select value={appr} onChange={setAppr} style={{ width: 130 }}
          options={[{ value: "", label: "全部" }, { value: "已审核", label: "已审核" }, { value: "未审核", label: "未审核" }]} />
        <Input.Search placeholder="物料编号/名称" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 220 }} />
        <Checkbox checked={onlyOwed} onChange={e => setOnlyOwed(e.target.checked)}>只看欠数</Checkbox>
        <Button onClick={() => downloadCsv("物料发外欠数表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("物料发外欠数表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
