import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Descriptions, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import type { ColumnsType } from "antd/es/table";
import {
  plasticRawMaterialDemandApi,
  type RMDDetail,
  type RMDLine,
  type RMDSummaryRow,
} from "../../api/plasticRawMaterialDemand";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

const MENU = "原料生产需求汇总";
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticRawMaterialDemandSummaryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [range, setRange] = useState<[Dayjs, Dayjs]>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [领料备注, set领料备注] = useState("");
  const [审核情况, set审核情况] = useState("");
  const [rows, setRows] = useState<RMDSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<RMDDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticRawMaterialDemandApi.summary({
        起: range[0].format("YYYY-MM-DD"),
        止: range[1].format("YYYY-MM-DD"),
        keyword: keyword || undefined,
        领料备注: 领料备注 || undefined,
        审核情况: 审核情况 || undefined,
      }));
    } catch { message.error("加载原料生产需求汇总失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, keyword, 领料备注, 审核情况]);
  useEffect(() => { load(); }, [canOpen, range, 领料备注, 审核情况]); // eslint-disable-line react-hooks/exhaustive-deps

  const jumpMonth = (offset: number) => {
    const base = dayjs().add(offset, "month");
    setRange([base.startOf("month"), base.endOf("month")]);
  };

  const openDetail = async (单号: string) => {
    setDetailLoading(true);
    try { setViewing(await plasticRawMaterialDemandApi.get(单号)); }
    catch { message.error("打开原料需求表失败"); }
    finally { setDetailLoading(false); }
  };

  const columns: ColumnsType<RMDSummaryRow> = [
    { title: "开单日期", dataIndex: "开单日期", width: 100, render: (v?: string) => v?.slice(0, 10) },
    { title: "生产车间", dataIndex: "生产车间", width: 120 },
    { title: "领料备注", dataIndex: "领料备注", width: 100 },
    { title: "啤机生产单号", dataIndex: "啤机生产单号", width: 130 },
    { title: "原料编号", dataIndex: "原料编号", width: 110 },
    { title: "原料名称", dataIndex: "原料名称", width: 180 },
    { title: "每包重量", dataIndex: "每包重量", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "单位", dataIndex: "单位", width: 80 },
    { title: "需求数量(KG)", dataIndex: "需求数量KG", width: 120, align: "right" as const },
    { title: "需求数量(包)", dataIndex: "需求数量包", width: 120, align: "right" as const },
    { title: "备注", dataIndex: "备注", width: 140 },
    { title: "制单人", dataIndex: "制单人", width: 90 },
    { title: "操作员", dataIndex: "操作员", width: 90 },
    { title: "审核", dataIndex: "审核", width: 80, render: (v?: string) => v === "1" ? "已审核" : "未审核" },
  ];

  const detailColumns: ColumnsType<RMDLine> = [
    { title: "原料编号", dataIndex: "原料编号", width: 120 },
    { title: "原料名称", dataIndex: "原料名称", width: 220 },
    { title: "每包重量", dataIndex: "每包重量", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "单位", dataIndex: "单位", width: 80 },
    { title: "需求数量(KG)", dataIndex: "需求数量KG", width: 130, align: "right" as const },
    { title: "需求数量(包)", dataIndex: "需求数量包", width: 130, align: "right" as const },
    { title: "备注", dataIndex: "备注", width: 180 },
  ];

  const sum = (k: keyof RMDSummaryRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const detailSum = (k: keyof RMDLine) => (viewing?.明细 ?? []).reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const exportCols: ExportCol[] = [
    { title: "开单日期", key: "开单日期", fmt: v => String(v ?? "").slice(0, 10) },
    { title: "生产车间", key: "生产车间" }, { title: "领料备注", key: "领料备注" },
    { title: "啤机生产单号", key: "啤机生产单号" }, { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" }, { title: "每包重量", key: "每包重量" },
    { title: "单位", key: "单位" }, { title: "需求数量(KG)", key: "需求数量KG" },
    { title: "需求数量(包)", key: "需求数量包" }, { title: "备注", key: "备注" },
    { title: "制单人", key: "制单人" }, { title: "操作员", key: "操作员" },
    { title: "审核", key: "审核", fmt: v => v === "1" ? "已审核" : "未审核" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料生产需求汇总·打开"权限）。</div></Card>;
  }

  const h = viewing?.单头;
  return (
    <Card title="原料生产需求汇总" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Button onClick={() => jumpMonth(-1)}>上月</Button>
        <Button onClick={() => jumpMonth(0)}>本月</Button>
        <Button onClick={() => jumpMonth(1)}>下月</Button>
        <DatePicker.RangePicker value={range} allowClear={false}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Select value={领料备注} onChange={set领料备注} style={{ width: 120 }}
          options={[{ value: "", label: "领料备注:全部" }, { value: "生产领料", label: "生产领料" }, { value: "样品领料", label: "样品领料" }, { value: "维修领料", label: "维修领料" }]} />
        <Select value={审核情况} onChange={set审核情况} style={{ width: 120 }}
          options={[{ value: "", label: "审核:全部" }, { value: "已审核", label: "已审核" }, { value: "未审核", label: "未审核" }]} />
        <Input.Search placeholder="单号/生产单号/原料/车间/制单人" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 280 }} />
        <Button onClick={() => downloadCsv("原料生产需求汇总.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料生产需求汇总", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table rowKey={(_, i) => String(i)} size="small" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content" }} pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onDoubleClick: () => openDetail(r.单号), style: { cursor: "pointer" } })}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><b>{sum("需求数量KG")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right"><b>{sum("需求数量包")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} colSpan={4} />
            </Table.Summary.Row>
          </Table.Summary>
        )} />

      <Modal open={!!viewing} title={`原料需求表${h?.单号 ? `（${h.单号}）` : ""}`} width={1180}
        onCancel={() => setViewing(null)} footer={null} destroyOnClose>
        {h && (
          <>
            <Descriptions size="small" bordered column={4} style={{ marginBottom: 12 }}>
              <Descriptions.Item label="啤机生产单号">{h.啤机生产单号}</Descriptions.Item>
              <Descriptions.Item label="开单日期">{h.开单日期?.slice(0, 10)}</Descriptions.Item>
              <Descriptions.Item label="制单人">{h.制单人}</Descriptions.Item>
              <Descriptions.Item label="审核">{h.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}</Descriptions.Item>
              <Descriptions.Item label="生产车间">{h.生产车间}</Descriptions.Item>
              <Descriptions.Item label="领料备注">{h.领料备注}</Descriptions.Item>
              <Descriptions.Item label="操作员">{h.操作员}</Descriptions.Item>
              <Descriptions.Item label="备注">{h.备注}</Descriptions.Item>
            </Descriptions>
            <Table rowKey={(_, i) => String(i)} size="small" loading={detailLoading} dataSource={viewing.明细}
              columns={detailColumns} pagination={false} scroll={{ x: "max-content" }}
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}><b>合计</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right"><b>{detailSum("需求数量KG")}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right"><b>{detailSum("需求数量包")}</b></Table.Summary.Cell>
                    <Table.Summary.Cell index={6} />
                  </Table.Summary.Row>
                </Table.Summary>
              )} />
          </>
        )}
      </Modal>
    </Card>
  );
}
