import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Col, DatePicker, Drawer, Form, Popconfirm, Row, Select, Space, Table, Input, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { rosterApi, shiftApi, type RosterRow, type ShiftRow } from "../../api/attendance";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "排班";
const { RangePicker } = DatePicker;

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

export default function RosterPage() {
  const perms = usePerms();
  const [开始, set开始] = useState<Dayjs | null>(dayjs().startOf("month"));
  const [结束, set结束] = useState<Dayjs | null>(dayjs().endOf("month"));
  const [部门编号, set部门编号] = useState("");
  const [rows, setRows] = useState<RosterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!开始 || !结束) { message.error("请选择开始与结束日期"); return; }
    setLoading(true);
    try {
      setRows(await rosterApi.list(
        开始.format("YYYY-MM-DD"), 结束.format("YYYY-MM-DD"), 部门编号 || undefined,
      ));
    } catch (e) { message.error(errMsg(e, "加载排班失败")); }
    finally { setLoading(false); }
  }, [开始, 结束, 部门编号]);
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (工号: string, 日期: string) => {
    try {
      await rosterApi.remove(工号, dayjs(日期).format("YYYY-MM-DD"));
      message.success("已删除"); load();
    } catch (e) { message.error(errMsg(e, "删除失败")); }
  };

  const columns = [
    { title: "工号", dataIndex: "工号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "姓名", dataIndex: "姓名" },
    { title: "日期", dataIndex: "日期", render: (v?: string) => (v ? dayjs(v).format("YYYY-MM-DD") : "") },
    { title: "班次", dataIndex: "班次" },
    ...(can(perms, MENU, "删除") ? [{
      title: "操作", key: "_op", width: 100,
      render: (_: unknown, row: RosterRow) => (
        <Popconfirm title="确认删除该排班?" onConfirm={() => remove(row.工号!, row.日期!)}>
          <a>删除</a>
        </Popconfirm>
      ),
    }] : []),
  ];

  return (
    <Card title="排班" variant="borderless"
      extra={
        <Space wrap>
          <DatePicker value={开始} onChange={set开始} placeholder="开始" />
          <DatePicker value={结束} onChange={set结束} placeholder="结束" />
          <Input placeholder="部门编号(空=全部)" allowClear value={部门编号}
            onChange={(e) => set部门编号(e.target.value)} onPressEnter={load} style={{ width: 160 }} />
          <Button onClick={load}>查询</Button>
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>批量排班</Button>
          )}
        </Space>
      }>
      <Table rowKey={(r, i) => `${r.工号 ?? ""}|${r.日期 ?? ""}|${i}`} size="middle" loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: true }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
      <AssignDrawer open={open} onClose={() => setOpen(false)} onSaved={load} />
    </Card>
  );
}

function AssignDrawer({ open, onClose, onSaved }: {
  open: boolean; onClose: () => void; onSaved: () => void;
}) {
  const [form] = Form.useForm<{ 工号集合: string[]; 范围: [Dayjs, Dayjs]; 班次: string }>();
  const [saving, setSaving] = useState(false);
  const [shifts, setShifts] = useState<ShiftRow[]>([]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    shiftApi.list().then(setShifts).catch(() => message.error("加载班次失败"));
  }, [open, form]);

  const submit = async () => {
    let v: { 工号集合: string[]; 范围: [Dayjs, Dayjs]; 班次: string };
    try { v = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      await rosterApi.assign({
        工号集合: v.工号集合,
        开始日期: v.范围[0].format("YYYY-MM-DD"),
        结束日期: v.范围[1].format("YYYY-MM-DD"),
        班次: v.班次,
      });
      message.success("已派班"); onClose(); onSaved();
    } catch (e) {
      message.error(errMsg(e, "派班失败"));
    } finally { setSaving(false); }
  };

  return (
    <Drawer title="批量排班" width={560} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>派班</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item name="工号集合" label="工号集合" rules={[{ required: true, message: "请输入工号" }]}>
              <Select mode="tags" placeholder="输入工号后回车" tokenSeparators={[",", " "]} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="范围" label="日期范围" rules={[{ required: true, message: "请选择日期范围" }]}>
              <RangePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="班次" label="班次" rules={[{ required: true, message: "请选择班次" }]}>
              <Select placeholder="选择班次"
                options={shifts.map((s) => ({ value: s.识别, label: `${s.识别} ${s.名称 ?? ""}` }))} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Drawer>
  );
}
