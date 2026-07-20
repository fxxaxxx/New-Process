import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Input, Select, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  plasticRawMaterialOutsourceShortageApi,
  type PlasticRawMaterialOutsourceShortageRow,
} from "../../api/plasticRawMaterialOutsourceShortage";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料发外欠数表";
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));

export default function PlasticRawMaterialOutsourceShortagePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [supplierCategory, setSupplierCategory] = useState("");
  const [keyword, setKeyword] = useState("");
  const [onlyOwed, setOnlyOwed] = useState(true);
  const [rows, setRows] = useState<PlasticRawMaterialOutsourceShortageRow[]>([]);
  const [allRows, setAllRows] = useState<PlasticRawMaterialOutsourceShortageRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const data = await plasticRawMaterialOutsourceShortageApi.list({
        供应商类别: supplierCategory || undefined,
        keyword: keyword.trim() || undefined,
        onlyOwed,
      });
      setRows(data);
    } catch {
      message.error("加载原料发外欠数表失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, keyword, onlyOwed, supplierCategory]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!canOpen) return;
    plasticRawMaterialOutsourceShortageApi.list({ onlyOwed: false })
      .then(setAllRows)
      .catch(() => { /* 类别加载失败不阻塞查询 */ });
  }, [canOpen]);

  const supplierCategoryOptions = useMemo(() => {
    const cats = Array.from(new Set(allRows.map(r => r.供应商类别).filter(Boolean) as string[]));
    return [{ value: "", label: "全部分类" }, ...cats.map(v => ({ value: v, label: v }))];
  }, [allRows]);

  const columns: ColumnsType<PlasticRawMaterialOutsourceShortageRow> = [
    { title: "供应商编号", dataIndex: "供应商编号", width: 130 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 220 },
    { title: "原料编号", dataIndex: "原料编号", width: 130 },
    { title: "原料名称", dataIndex: "原料名称", width: 260 },
    { title: "单位", dataIndex: "单位", width: 90 },
    { title: "发外欠数", dataIndex: "发外欠数", width: 120, align: "right", render: fmtNum },
  ];

  const exportCols: ExportCol[] = [
    { title: "供应商编号", key: "供应商编号" },
    { title: "供应商名称", key: "供应商名称" },
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "单位", key: "单位" },
    { title: "发外欠数", key: "发外欠数" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];
  const sum = rows.reduce((s, r) => s + Number(r.发外欠数 ?? 0), 0);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“原料发外欠数表·打开”权限）。</div></Card>;
  }

  return (
    <Card title="原料发外欠数表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={supplierCategory} onChange={setSupplierCategory} style={{ width: 160 }} options={supplierCategoryOptions} />
        <Input.Search placeholder="原料名称/编号/供应商" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 260 }} />
        <Checkbox checked={onlyOwed} onChange={e => setOnlyOwed(e.target.checked)}>只看欠数</Checkbox>
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={() => downloadCsv("原料发外欠数表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料发外欠数表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table
        rowKey={(_, i) => String(i)}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content" }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={5}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={5} align="right"><b>{fmtNum(sum)}</b></Table.Summary.Cell>
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
}
