import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, DatePicker, Input, Select, Space, Table, message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { dailyApi, type DailyRow } from "../../api/attendance";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "刷卡录入";
const { RangePicker } = DatePicker;

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

export default function DailyPage() {
  const perms = usePerms();

  // 录入区
  const [工号, set工号] = useState("");
  const [日期, set日期] = useState<Dayjs | null>(dayjs());
  const [刷卡, set刷卡] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 列表区
  const [f工号, setF工号] = useState("");
  const [开始, set开始] = useState<Dayjs | null>(dayjs().startOf("month"));
  const [结束, set结束] = useState<Dayjs | null>(dayjs().endOf("month"));
  const [部门, set部门] = useState("");
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!开始 || !结束) { message.error("请选择日期范围"); return; }
    setLoading(true);
    try {
      setRows(await dailyApi.list(
        f工号 || undefined, 开始.format("YYYY-MM-DD"), 结束.format("YYYY-MM-DD"), 部门 || undefined,
      ));
    } catch (e) { message.error(errMsg(e, "加载日报失败")); }
    finally { setLoading(false); }
  }, [f工号, 开始, 结束, 部门]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!工号.trim()) { message.error("请输入工号"); return; }
    if (!日期) { message.error("请选择日期"); return; }
    setSaving(true);
    try {
      await dailyApi.save({ 工号: 工号.trim(), 日期: 日期.format("YYYY-MM-DD"), 刷卡 });
      message.success("已保存"); load();
    } catch (e) { message.error(errMsg(e, "保存失败")); }
    finally { setSaving(false); }
  };

  const columns = [
    { title: "工号", dataIndex: "工号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "姓名", dataIndex: "姓名" },
    { title: "部门", dataIndex: "部门" },
    { title: "日期", dataIndex: "日期", render: (v?: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "") },
    { title: "上午", dataIndex: "上午" },
    { title: "下午", dataIndex: "下午" },
    { title: "合计时间", dataIndex: "合计时间" },
    { title: "加班", dataIndex: "加班" },
    { title: "迟到分", dataIndex: "迟到分" },
    { title: "早退分", dataIndex: "早退分" },
    { title: "迟到次数", dataIndex: "迟到次数" },
    { title: "早退次数", dataIndex: "早退次数" },
  ];

  return (
    <Space direction="vertical" size={16} style={{ display: "flex" }}>
      <Card title="刷卡录入" variant="borderless">
        <Space wrap>
          <Input placeholder="工号" value={工号} allowClear
            onChange={(e) => set工号(e.target.value)} style={{ width: 160 }} />
          <DatePicker value={日期} onChange={set日期} placeholder="日期" allowClear={false} />
          <Select mode="tags" value={刷卡} onChange={set刷卡} placeholder="刷卡时刻 HH:mm(回车添加)"
            tokenSeparators={[",", " "]} style={{ minWidth: 280 }} />
          {can(perms, MENU, "保存") && (
            <Button type="primary" loading={saving} onClick={save}>保存</Button>
          )}
        </Space>
      </Card>

      <Card title="日报列表" variant="borderless"
        extra={
          <Space wrap>
            <Input placeholder="工号(空=全部)" allowClear value={f工号}
              onChange={(e) => setF工号(e.target.value)} onPressEnter={load} style={{ width: 140 }} />
            <RangePicker value={[开始, 结束]} onChange={(v) => { set开始(v?.[0] ?? null); set结束(v?.[1] ?? null); }} />
            <Input placeholder="部门(空=全部)" allowClear value={部门}
              onChange={(e) => set部门(e.target.value)} onPressEnter={load} style={{ width: 140 }} />
            <Button onClick={load}>查询</Button>
          </Space>
        }>
        <Table rowKey={(r, i) => `${r.工号 ?? ""}|${r.日期 ?? ""}|${i}`} size="middle" loading={loading}
          dataSource={rows} columns={columns} scroll={{ x: true }}
          pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
      </Card>
    </Space>
  );
}
