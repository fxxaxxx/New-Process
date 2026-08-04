import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Col, Drawer, Form, Input, InputNumber, Popconfirm, Row, Space, Table, TimePicker, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { shiftApi, type ShiftRow } from "../../api/attendance";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "班次管理";

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

export default function ShiftPage() {
  const perms = usePerms();
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<ShiftRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);   // 识别; "" = 新建
  const [open, setOpen] = useState(false);
  const [selRow, setSelRow] = useState<ShiftRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await shiftApi.list(keyword)); setSelRow(null); }
    catch { message.error("加载班次失败"); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const remove = async (识别: string) => {
    try { await shiftApi.remove(识别); message.success("已删除"); load(); }
    catch (e) { message.error(errMsg(e, "删除失败")); }
  };

  const openNew = () => { setEditing(""); setOpen(true); };
  const openEdit = (识别: string) => { setEditing(识别); setOpen(true); };

  const columns = [
    { title: "识别", dataIndex: "识别", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "名称", dataIndex: "名称" },
    { title: "上午", key: "_am", render: (_: unknown, r: ShiftRow) => `${r.上午上班 ?? ""}-${r.上午下班 ?? ""}` },
    { title: "下午", key: "_pm", render: (_: unknown, r: ShiftRow) => `${r.下午上班 ?? ""}-${r.下午下班 ?? ""}` },
    { title: "总小时", dataIndex: "总小时", width: 90 },
    { title: "迟到分钟", dataIndex: "迟到分钟", width: 90 },
    { title: "早退分钟", dataIndex: "早退分钟", width: 90 },
  ];

  return (
    <Card title="班次管理" variant="borderless"
      extra={
        <Space wrap>
          <Input placeholder="识别/名称(空=全部)" allowClear value={keyword}
            onChange={(e) => setKeyword(e.target.value)} onPressEnter={load} style={{ width: 200 }} />
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新建</Button>
          )}
          {can(perms, MENU, "保存") && (
            <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow.识别!)}>编辑</Button>
          )}
          {can(perms, MENU, "删除") && (
            <Popconfirm
              title={`确认删除该班次${selRow ? ` [${selRow.识别}]` : ""}?`}
              onConfirm={() => selRow && remove(selRow.识别!)}>
              <Button danger disabled={!selRow}>删除</Button>
            </Popconfirm>
          )}
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow ? `已选中:${selRow.识别}` : "双击行选中后可编辑/删除"}
          </span>
        </Space>
      }>
      <Table rowKey={(r) => r.识别 ?? ""} size="middle" loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        onRow={(r: ShiftRow) => ({
          onDoubleClick: () => setSelRow(r),
          style: { cursor: "pointer", ...(selRow && selRow.识别 === r.识别 ? { background: "#e6f4ff" } : {}) },
        })}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
      <EditDrawer open={open} 识别={editing} onClose={() => setOpen(false)} onSaved={load} />
    </Card>
  );
}

function EditDrawer({ open, 识别, onClose, onSaved }: {
  open: boolean; 识别: string | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!识别;
  const [form] = Form.useForm<{
    识别: string; 名称?: string;
    上午上班?: Dayjs; 上午下班?: Dayjs; 下午上班?: Dayjs; 下午下班?: Dayjs;
    总小时?: number; 迟到分钟?: number; 早退分钟?: number;
  }>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const parse = (v?: string) => (v ? dayjs(v, "HH:mm") : undefined);
    if (isEdit) {
      setLoading(true);
      shiftApi.get(识别!).then((d) => {
        form.setFieldsValue({
          识别: d.识别 ?? "", 名称: d.名称 ?? "",
          上午上班: parse(d.上午上班), 上午下班: parse(d.上午下班),
          下午上班: parse(d.下午上班), 下午下班: parse(d.下午下班),
          总小时: d.总小时, 迟到分钟: d.迟到分钟, 早退分钟: d.早退分钟,
        });
      }).catch((e) => message.error(errMsg(e, "加载班次失败")))
        .finally(() => setLoading(false));
    } else {
      form.resetFields();
    }
  }, [open, isEdit, 识别, form]);

  const submit = async () => {
    let v: {
      识别: string; 名称?: string;
      上午上班?: Dayjs; 上午下班?: Dayjs; 下午上班?: Dayjs; 下午下班?: Dayjs;
      总小时?: number; 迟到分钟?: number; 早退分钟?: number;
    };
    try { v = await form.validateFields(); } catch { return; }
    const hm = (t?: Dayjs) => (t ? t.format("HH:mm") : undefined);
    const body: ShiftRow = {
      识别: v.识别.trim(), 名称: v.名称?.trim() || undefined,
      上午上班: hm(v.上午上班), 上午下班: hm(v.上午下班),
      下午上班: hm(v.下午上班), 下午下班: hm(v.下午下班),
      总小时: v.总小时, 迟到分钟: v.迟到分钟, 早退分钟: v.早退分钟,
    };
    setSaving(true);
    try {
      await shiftApi.save(body);
      message.success("已保存"); onClose(); onSaved();
    } catch (e) {
      message.error(errMsg(e, "保存失败"));
    } finally { setSaving(false); }
  };

  return (
    <Drawer title={isEdit ? "编辑班次" : "新建班次"} width={560} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical" disabled={loading}>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="识别" label="识别" rules={[{ required: true, message: "请输入识别" }]}>
              <Input placeholder="识别" disabled={isEdit} />
            </Form.Item>
          </Col>
          <Col span={12}><Form.Item name="名称" label="名称"><Input placeholder="可选" /></Form.Item></Col>
          <Col span={12}><Form.Item name="上午上班" label="上午上班"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={12}><Form.Item name="上午下班" label="上午下班"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={12}><Form.Item name="下午上班" label="下午上班"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={12}><Form.Item name="下午下班" label="下午下班"><TimePicker format="HH:mm" style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="总小时" label="总小时"><InputNumber min={0} step={0.5} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="迟到分钟" label="迟到分钟"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={8}><Form.Item name="早退分钟" label="早退分钟"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
        </Row>
      </Form>
    </Drawer>
  );
}
