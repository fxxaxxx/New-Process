import { useCallback, useEffect, useState } from "react";
import {
  Alert, Button, Card, Drawer, Form, Input, Popconfirm, Select, Space, Table, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import {
  wageTemplateApi, type WageTemplateHeader, type WageTemplateItem,
} from "../../api/payroll";
import { validWageItems } from "../../utils/payroll";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "工资模板";
const 类型选项 = ["应发", "应扣", "合计"];

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

export default function WageTemplatePage() {
  const perms = usePerms();
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<WageTemplateHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);   // 模板编号; "" = 新建
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await wageTemplateApi.list(keyword || undefined)); }
    catch { message.error("加载工资模板失败"); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const remove = async (模板编号: string) => {
    try { await wageTemplateApi.remove(模板编号); message.success("已删除"); load(); }
    catch (e) { message.error(errMsg(e, "删除失败")); }
  };

  const openNew = () => { setEditing(""); setOpen(true); };
  const openEdit = (模板编号: string) => { setEditing(模板编号); setOpen(true); };

  const columns = [
    { title: "模板编号", dataIndex: "模板编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "模板名称", dataIndex: "模板名称" },
    { title: "项目数", dataIndex: "项目数", width: 100 },
    {
      title: "操作", key: "_op", width: 140,
      render: (_: unknown, row: WageTemplateHeader) => (
        <Space>
          {can(perms, MENU, "保存") && <a onClick={() => openEdit(row.模板编号!)}>编辑</a>}
          {can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该工资模板?" onConfirm={() => remove(row.模板编号!)}>
              <a>删除</a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="工资模板" variant="borderless"
      extra={
        <Space wrap>
          <Input placeholder="编号/名称(空=全部)" allowClear value={keyword}
            onChange={(e) => setKeyword(e.target.value)} onPressEnter={load} style={{ width: 200 }} />
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新建</Button>
          )}
        </Space>
      }>
      <Table rowKey={(r) => r.模板编号 ?? ""} size="middle" loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
      <EditDrawer open={open} 模板编号={editing} onClose={() => setOpen(false)} onSaved={load} />
    </Card>
  );
}

function EditDrawer({ open, 模板编号, onClose, onSaved }: {
  open: boolean; 模板编号: string | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!模板编号;
  const [编号, set编号] = useState("");
  const [名称, set名称] = useState("");
  const [items, setItems] = useState<WageTemplateItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setLoading(true);
      wageTemplateApi.get(模板编号!).then((d) => {
        set编号(d.模板编号 ?? "");
        set名称(d.模板名称 ?? "");
        setItems(d.明细 ?? []);
      }).catch((e) => message.error(errMsg(e, "加载模板失败")))
        .finally(() => setLoading(false));
    } else {
      set编号(""); set名称(""); setItems([{ 类型: "应发" }]);
    }
  }, [open, isEdit, 模板编号]);

  const setItem = (i: number, patch: Partial<WageTemplateItem>) =>
    setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  const submit = async () => {
    if (!编号.trim()) { message.error("请输入模板编号"); return; }
    if (items.length === 0) { message.error("请至少添加一个项目"); return; }
    if (!validWageItems(items)) { message.error("台头项目不能为空且不可重复"); return; }
    setSaving(true);
    try {
      await wageTemplateApi.save({
        模板编号: 编号.trim(),
        模板名称: 名称.trim() || undefined,
        明细: items.map((it, i) => ({ ...it, 序号: i + 1, 台头项目: (it.台头项目 ?? "").trim() })),
      });
      message.success("已保存"); onClose(); onSaved();
    } catch (e) {
      message.error(errMsg(e, "保存失败"));
    } finally { setSaving(false); }
  };

  const columns = [
    {
      title: "台头项目", dataIndex: "台头项目", width: 200,
      render: (_: unknown, r: WageTemplateItem, i: number) => (
        <Input value={r.台头项目 ?? ""} placeholder="如:底薪" onChange={(e) => setItem(i, { 台头项目: e.target.value })} />
      ),
    },
    {
      title: "类型", dataIndex: "类型", width: 120,
      render: (_: unknown, r: WageTemplateItem, i: number) => (
        <Select style={{ width: "100%" }} value={r.类型 ?? undefined} placeholder="类型"
          onChange={(v: string) => setItem(i, { 类型: v })}
          options={类型选项.map((t) => ({ value: t, label: t }))} />
      ),
    },
    {
      title: "公式", dataIndex: "公式",
      render: (_: unknown, r: WageTemplateItem, i: number) => (
        <Input value={r.公式 ?? ""} placeholder="可选" onChange={(e) => setItem(i, { 公式: e.target.value })} />
      ),
    },
    {
      title: "", key: "_op", width: 50,
      render: (_: unknown, __: WageTemplateItem, i: number) => (
        <a onClick={() => setItems((prev) => prev.filter((_, j) => j !== i))}>删除</a>
      ),
    },
  ];

  return (
    <Drawer title={isEdit ? "编辑工资模板" : "新建工资模板"} width={720} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form layout="vertical">
        <Form.Item label="模板编号" required>
          <Input value={编号} disabled={isEdit} placeholder="模板编号"
            onChange={(e) => set编号(e.target.value)} />
        </Form.Item>
        <Form.Item label="模板名称">
          <Input value={名称} placeholder="可选" onChange={(e) => set名称(e.target.value)} />
        </Form.Item>
        <Alert type="info" showIcon style={{ marginBottom: 12 }}
          message="公式可用变量"
          description="基本工资、计件工资、应出勤天数、实出勤天数、缺勤天数、加班工时、出勤工时、迟到次数、早退次数，以及排在前面的台头项目名。支持 + - * / ( )。例:加班工时*15 或 基本工资-迟到次数*20" />
        <Form.Item label="明细项目">
          <Table size="small" rowKey={(_: WageTemplateItem, i?: number) => String(i)} loading={loading}
            pagination={false} dataSource={items} columns={columns} />
          <Button icon={<PlusOutlined />} style={{ marginTop: 12 }}
            onClick={() => setItems((prev) => [...prev, { 类型: "应发" }])}>添加项目</Button>
        </Form.Item>
      </Form>
    </Drawer>
  );
}
