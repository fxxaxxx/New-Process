import { useCallback, useEffect, useState } from "react";
import { Card, Select, DatePicker, Input, Button, Table, Space, Popconfirm, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { monthEndApi, type MonthEndRow } from "../../api/monthEnd";
import { dimColumns, toYearMonth, type Kind } from "../../utils/monthEnd";
import { usePerms } from "../../auth/PermissionContext";
import { can } from "../../auth/permissions";

export default function MonthEnd() {
  const perms = usePerms();
  const [kind, setKind] = useState<Kind>("成品");
  const [month, setMonth] = useState<Dayjs | null>(dayjs());
  const [仓库, set仓库] = useState("");
  const [rows, setRows] = useState<MonthEndRow[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const 年月 = toYearMonth(month);
  const canClose = can(perms, "库存月结", "功能");
  const canReopen = can(perms, "库存月结", "删除");

  const loadPeriods = useCallback(async () => {
    try { setPeriods(await monthEndApi.periods(kind)); } catch { /* 静默 */ }
  }, [kind]);
  const loadReport = useCallback(async () => {
    if (!年月) { setRows([]); return; }
    try { setRows(await monthEndApi.report(年月, kind, 仓库 || undefined)); }
    catch { message.error("加载月报失败"); }
  }, [年月, kind, 仓库]);
  useEffect(() => { loadPeriods(); }, [loadPeriods]);
  useEffect(() => { loadReport(); }, [loadReport]);

  const doClose = async () => {
    if (!年月) return;
    setBusy(true);
    try {
      const r = await monthEndApi.close({ 年月, 口径: kind, 仓库: 仓库 || undefined });
      message.success(`月结完成：仓库 ${r.仓库.length} 个，明细 ${r.结数} 行`);
      await loadPeriods(); await loadReport();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { 消息?: string } } })?.response?.data?.消息;
      message.error(msg ?? "月结失败");
    } finally { setBusy(false); }
  };
  const doReopen = async () => {
    if (!年月) return;
    setBusy(true);
    try {
      const r = await monthEndApi.reopen({ 年月, 口径: kind, 仓库: 仓库 || undefined });
      message.success(`反月结完成：删除 ${r.删数} 行`);
      await loadPeriods(); await loadReport();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { 消息?: string } } })?.response?.data?.消息;
      message.error(msg ?? "反月结失败");
    } finally { setBusy(false); }
  };

  const columns = [
    ...dimColumns(kind),
    { title: "期初", dataIndex: "期初", render: (v: number) => <span className="erp-num">{v}</span> },
    { title: "本期入", dataIndex: "本期入" },
    { title: "本期出", dataIndex: "本期出" },
    { title: "结存", dataIndex: "结存",
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
  ];

  return (
    <Card title="库存月结" variant="borderless"
      extra={
        <Space wrap>
          <Select value={kind} onChange={(v) => setKind(v as Kind)} style={{ width: 110 }}
            options={[{ value: "成品", label: "成品" }, { value: "半成品", label: "半成品" }, { value: "物料", label: "物料" }]} />
          <DatePicker picker="month" value={month} onChange={setMonth} allowClear={false} />
          <Input placeholder="仓库(空=全部)" allowClear value={仓库}
            onChange={(e) => set仓库(e.target.value)} style={{ width: 160 }} />
          {canClose && (
            <Popconfirm title={`确认月结 ${年月} ${kind}?`} onConfirm={doClose}>
              <Button type="primary" loading={busy}>执行月结</Button>
            </Popconfirm>
          )}
          {canReopen && (
            <Popconfirm title={`确认反月结 ${年月} ${kind}?`} onConfirm={doReopen}>
              <Button danger loading={busy}>反月结</Button>
            </Popconfirm>
          )}
        </Space>
      }>
      <div style={{ marginBottom: 12, color: "#888" }}>已结月份：{periods.join("、") || "（无）"}</div>
      <Table rowKey={(r, i) => `${r.仓库}|${r.款号 ?? r.物料编号}|${r.色号 ?? ""}|${r.颜色 ?? ""}|${r.尺码 ?? ""}|${i}`}
        size="middle" dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
    </Card>
  );
}
