import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, DatePicker, Drawer, Input, InputNumber, Popconfirm, Select, Space, Table, message,
} from "antd";
import { ThunderboltOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import {
  payrollApi, wageTemplateApi,
  type PayrollSummaryRow, type PayrollDetail, type WageTemplateHeader,
} from "../../api/payroll";
import { payrollColumns, toYearMonth } from "../../utils/payroll";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "工资表";

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

const money = (v: unknown) => (v == null || v === "" ? "" : String(v));

export default function PayrollRunPage() {
  const perms = usePerms();
  const [month, setMonth] = useState<Dayjs | null>(dayjs());
  const [部门编号, set部门编号] = useState("");
  const [模板编号, set模板编号] = useState<string | undefined>(undefined);
  const [应出勤天数, set应出勤天数] = useState<number>(26);
  const [templates, setTemplates] = useState<WageTemplateHeader[]>([]);
  const [rows, setRows] = useState<PayrollSummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [detail, setDetail] = useState<PayrollDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const 月份 = toYearMonth(month);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await payrollApi.list(月份 || undefined, 部门编号 || undefined)); }
    catch { message.error("加载工资总表失败"); }
    finally { setLoading(false); }
  }, [月份, 部门编号]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    wageTemplateApi.list().then(setTemplates).catch(() => message.error("加载工资模板失败"));
  }, []);

  const generate = async () => {
    if (!月份) { message.error("请选择月份"); return; }
    if (!部门编号.trim()) { message.error("请输入部门编号"); return; }
    if (!模板编号) { message.error("请选择工资模板"); return; }
    if (!应出勤天数) { message.error("请输入应出勤天数"); return; }
    setGenerating(true);
    try {
      const r = await payrollApi.generate({
        月份, 部门编号: 部门编号.trim(), 模板编号, 应出勤天数,
      });
      message.success(`已生成工资表 ${r.工资表编号}`);
      load();
    } catch (e) {
      message.error(errMsg(e, "生成失败"));
    } finally { setGenerating(false); }
  };

  const remove = async (工资表编号: string) => {
    try { await payrollApi.remove(工资表编号); message.success("已反生成"); load(); }
    catch (e) { message.error(errMsg(e, "反生成失败")); }
  };

  const openDetail = async (工资表编号: string) => {
    setDetail(null); setDetailOpen(true); setDetailLoading(true);
    try { setDetail(await payrollApi.detail(工资表编号)); }
    catch (e) { message.error(errMsg(e, "加载工资表明细失败")); }
    finally { setDetailLoading(false); }
  };

  const columns = [
    { title: "工资表编号", dataIndex: "工资表编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "月份", dataIndex: "月份" },
    { title: "部门编号", dataIndex: "部门编号" },
    { title: "模板编号", dataIndex: "模板编号" },
    { title: "基本工资", dataIndex: "基本工资", render: money },
    { title: "计件工资", dataIndex: "计件工资", render: money },
    { title: "应发合计", dataIndex: "应发合计", render: money },
    { title: "应扣合计", dataIndex: "应扣合计", render: money },
    { title: "实发合计", dataIndex: "实发合计", render: money },
    {
      title: "操作", key: "_op", width: 140,
      render: (_: unknown, row: PayrollSummaryRow) => (
        <Space>
          <a onClick={() => openDetail(row.工资表编号!)}>查看</a>
          {can(perms, MENU, "删除") && (
            <Popconfirm title="确认反生成该工资表?" onConfirm={() => remove(row.工资表编号!)}>
              <a>反生成</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const detailColumns = detail
    ? payrollColumns(detail.项目).map(c =>
        ["基本工资", "计件工资", "应发合计", "应扣合计", "实发合计"].includes(c.dataIndex) ||
        detail.项目.some(p => p.列名 === c.dataIndex)
          ? { ...c, render: money }
          : c,
      )
    : [];

  return (
    <Card title="工资表" variant="borderless"
      extra={
        <Space wrap>
          <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
          <Input placeholder="部门编号" allowClear value={部门编号}
            onChange={(e) => set部门编号(e.target.value)} style={{ width: 140 }} />
          <Select placeholder="工资模板" allowClear value={模板编号} onChange={set模板编号}
            style={{ width: 220 }}
            options={templates.map(t => ({
              value: t.模板编号,
              label: `${t.模板编号}${t.模板名称 ? ` ${t.模板名称}` : ""}`,
            }))} />
          <InputNumber min={1} value={应出勤天数} onChange={(n) => set应出勤天数(Number(n ?? 0))}
            addonBefore="应出勤天数" style={{ width: 190 }} />
          {can(perms, MENU, "功能") && (
            <Popconfirm title="确认按当前条件生成工资表?" onConfirm={generate}>
              <Button type="primary" icon={<ThunderboltOutlined />} loading={generating}>生成</Button>
            </Popconfirm>
          )}
        </Space>
      }>
      <Table rowKey={(r) => r.工资表编号 ?? ""} size="middle" loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: true }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />

      <Drawer title="工资表明细" width="80%" open={detailOpen} onClose={() => setDetailOpen(false)}>
        <Table rowKey={(r) => String((r as Record<string, unknown>).编号 ?? "")} size="small"
          loading={detailLoading} dataSource={detail?.明细 ?? []} columns={detailColumns}
          scroll={{ x: true }}
          pagination={{ pageSize: 50, showTotal: (t) => `共 ${t} 条` }} />
      </Drawer>
    </Card>
  );
}
