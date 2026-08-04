import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { type Dayjs } from "dayjs";
import {
  plasticRawMaterialIssueProgressApi,
  type PlasticRawMaterialIssueProgressRow,
} from "../../api/plasticRawMaterialIssueProgress";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";

// 权限照抄后端:gate 在「原料出库表·打开」(同辅料出库进度表 gate「领料单」)。
const MENU = "原料出库表";
const defaultRange = (): [Dayjs, Dayjs] => [dayjs().subtract(1, "month"), dayjs()];

const fmtDate = (v?: string) => {
  if (!v) return "";
  const d = dayjs(v);
  return d.isValid() ? d.format("YYYY/M/D") : String(v).slice(0, 10);
};
const fmtExportDate = (v: unknown) => fmtDate(typeof v === "string" ? v : undefined);
const fmtNum = (v?: number | null) => (v == null ? "" : Number(v));
const fmtProgress = (v?: number | null) =>
  v == null ? "" : <span style={{ color: v >= 100 ? "#3f8600" : "#cf1322" }}>{Number(v)}%</span>;

export default function PlasticRawMaterialIssueProgressPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [arrivalStatus, setArrivalStatus] = useState("未到");
  const [useDate, setUseDate] = useState(true);
  const [range, setRange] = useState<[Dayjs, Dayjs]>(defaultRange);
  const [issueRemark, setIssueRemark] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialIssueProgressRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      setRows(await plasticRawMaterialIssueProgressApi.list({
        到货情况: arrivalStatus === "全部" ? undefined : arrivalStatus,
        起: useDate ? range[0].format("YYYY-MM-DD") : undefined,
        止: useDate ? range[1].format("YYYY-MM-DD") : undefined,
        领料备注: issueRemark === "全部" ? undefined : issueRemark,
        keyword: keyword.trim() || undefined,
      }));
    } catch {
      message.error("加载原料出库进度表失败");
    } finally {
      setLoading(false);
    }
  }, [arrivalStatus, canOpen, issueRemark, keyword, range, useDate]);

  useEffect(() => { load(); }, [load]);

  const columns: ColumnsType<PlasticRawMaterialIssueProgressRow> = useMemo(() => [
    { title: "开单日期", dataIndex: "开单日期", width: 105, render: fmtDate },
    { title: "需求单号", dataIndex: "需求单号", width: 135, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "啤机生产单号", dataIndex: "啤机生产单号", width: 145, render: (v?: string) => <span className="erp-num">{v}</span> },
    { title: "领料备注", dataIndex: "领料备注", width: 105 },
    { title: "生产车间", dataIndex: "生产车间", width: 110 },
    { title: "原料编号", dataIndex: "原料编号", width: 115 },
    { title: "原料名称", dataIndex: "原料名称", width: 170 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "需求数量", dataIndex: "需求数量", width: 95, align: "right", render: fmtNum },
    { title: "已出库数量", dataIndex: "已出库数量", width: 100, align: "right", render: fmtNum },
    { title: "欠数", dataIndex: "欠数", width: 95, align: "right",
      render: (v?: number | null) => v == null ? "" : <span style={{ color: v > 0 ? "#cf1322" : undefined }}>{Number(v)}</span> },
    { title: "进度", dataIndex: "进度", width: 90, align: "right", render: fmtProgress },
    { title: "最后出库日期", dataIndex: "最后出库日期", width: 115, render: fmtDate },
    { title: "审核", dataIndex: "审核", width: 80, align: "center", render: (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
  ], []);

  const exportCols: ExportCol[] = [
    { title: "开单日期", key: "开单日期", fmt: fmtExportDate },
    { title: "需求单号", key: "需求单号" },
    { title: "啤机生产单号", key: "啤机生产单号" },
    { title: "领料备注", key: "领料备注" },
    { title: "生产车间", key: "生产车间" },
    { title: "原料编号", key: "原料编号" },
    { title: "原料名称", key: "原料名称" },
    { title: "单位", key: "单位" },
    { title: "需求数量", key: "需求数量" },
    { title: "已出库数量", key: "已出库数量" },
    { title: "欠数", key: "欠数" },
    { title: "进度", key: "进度" },
    { title: "最后出库日期", key: "最后出库日期", fmt: fmtExportDate },
    { title: "审核", key: "审核" },
  ];
  const asRecords = () => rows as unknown as Record<string, unknown>[];
  const sum = (k: keyof PlasticRawMaterialIssueProgressRow) => rows.reduce((s, r) => s + Number(r[k] ?? 0), 0);

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“原料出库表·打开”权限）。</div></Card>;
  }

  return (
    <Card title="原料出库进度表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Select value={arrivalStatus} style={{ width: 110 }} onChange={setArrivalStatus}
          options={["全部", "未到", "已到"].map(v => ({ value: v, label: v }))} />
        <Select value={useDate ? "开单日期" : "不选择日期"} style={{ width: 130 }}
          onChange={v => setUseDate(v === "开单日期")}
          options={["不选择日期", "开单日期"].map(v => ({ value: v, label: v }))} />
        <DatePicker.RangePicker value={range} allowClear={false} disabled={!useDate}
          onChange={v => { if (v && v[0] && v[1]) setRange([v[0], v[1]]); }} />
        <Select value={issueRemark} style={{ width: 120 }} onChange={setIssueRemark}
          options={["全部", "生产领料", "样品领料", "维修领料"].map(v => ({ value: v, label: v }))} />
        <Input.Search placeholder="需求单号/啤机生产单号/原料" allowClear value={keyword}
          onChange={e => setKeyword(e.target.value)} onSearch={load} style={{ width: 260 }} />
        <Button type="primary" onClick={load}>查询</Button>
        <Button onClick={() => downloadCsv("原料出库进度表.csv", exportCols, asRecords())}>导出EXCEL</Button>
        <Button onClick={() => printTable("原料出库进度表", exportCols, asRecords())}>打印</Button>
        <span style={{ color: "#888" }}>共 {rows.length} 条</span>
      </Space>
      <Table
        rowKey={(_, i) => String(i)}
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 50, showTotal: t => `共 ${t} 条` }}
        summary={() => (
          <Table.Summary fixed>
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={8}><b>合计</b></Table.Summary.Cell>
              <Table.Summary.Cell index={8} align="right"><b>{sum("需求数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={9} align="right"><b>{sum("已出库数量")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={10} align="right"><b>{sum("欠数")}</b></Table.Summary.Cell>
              <Table.Summary.Cell index={11} />
              <Table.Summary.Cell index={12} />
              <Table.Summary.Cell index={13} />
            </Table.Summary.Row>
          </Table.Summary>
        )}
      />
    </Card>
  );
}
