import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Drawer, Form, Input, Popconfirm, Space, Switch, Table, Tag, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { sysConfigApi, type SysConfigRow } from "../../api/sysConfig";
import { displayValue } from "../../utils/sysConfig";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "系统配置";

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

export default function SysConfigPage() {
  const perms = usePerms();
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<SysConfigRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);   // 键; "" = 新建
  const [open, setOpen] = useState(false);
  const [selRow, setSelRow] = useState<SysConfigRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await sysConfigApi.list(keyword)); setSelRow(null); }
    catch { message.error("加载系统参数失败"); }
    finally { setLoading(false); }
  }, [keyword]);
  useEffect(() => { load(); }, [load]);

  const remove = async (键: string) => {
    try { await sysConfigApi.remove(键); message.success("已删除"); load(); }
    catch (e) { message.error(errMsg(e, "删除失败")); }
  };

  const openNew = () => { setEditing(""); setOpen(true); };
  const openEdit = (键: string) => { setEditing(键); setOpen(true); };

  const columns = [
    { title: "键", dataIndex: "键", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "值", dataIndex: "值", render: (_: unknown, row: SysConfigRow) => displayValue(row) },
    {
      title: "是否加密", dataIndex: "是否加密", width: 100,
      render: (v: boolean) => (v ? <Tag color="orange">是</Tag> : <Tag>否</Tag>),
    },
    { title: "备注", dataIndex: "备注" },
  ];

  return (
    <Card title="系统参数" variant="borderless"
      extra={
        <Space wrap>
          <Input placeholder="键/备注(空=全部)" allowClear value={keyword}
            onChange={(e) => setKeyword(e.target.value)} onPressEnter={load} style={{ width: 200 }} />
          {can(perms, MENU, "保存") && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openNew}>新建</Button>
          )}
          {can(perms, MENU, "保存") && (
            <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow.键!)}>编辑</Button>
          )}
          {can(perms, MENU, "删除") && (
            <Popconfirm
              title={`确认删除该系统参数${selRow ? ` [${selRow.键}]` : ""}?`}
              onConfirm={() => selRow && remove(selRow.键!)}>
              <Button danger disabled={!selRow}>删除</Button>
            </Popconfirm>
          )}
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow ? `已选中:${selRow.键}` : "双击行选中后可编辑/删除"}
          </span>
        </Space>
      }>
      <Table rowKey={(r) => r.键 ?? ""} size="middle" loading={loading}
        dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        onRow={(r: SysConfigRow) => ({
          onDoubleClick: () => setSelRow(r),
          style: { cursor: "pointer", ...(selRow && selRow.键 === r.键 ? { background: "#e6f4ff" } : {}) },
        })}
        pagination={{ pageSize: 20, showTotal: (t) => `共 ${t} 条` }} />
      <EditDrawer open={open} 键={editing} onClose={() => setOpen(false)} onSaved={load} />
    </Card>
  );
}

function EditDrawer({ open, 键, onClose, onSaved }: {
  open: boolean; 键: string | null; onClose: () => void; onSaved: () => void;
}) {
  const isEdit = !!键;
  const [键值, set键值] = useState("");
  const [值, set值] = useState("");
  const [是否加密, set是否加密] = useState(false);
  const [备注, set备注] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (isEdit) {
      setLoading(true);
      sysConfigApi.get(键!).then((d) => {
        set键值(d.键 ?? "");
        set值(d.值 ?? "");
        set是否加密(d.是否加密);
        set备注(d.备注 ?? "");
      }).catch((e) => message.error(errMsg(e, "加载系统参数失败")))
        .finally(() => setLoading(false));
    } else {
      set键值(""); set值(""); set是否加密(false); set备注("");
    }
  }, [open, isEdit, 键]);

  const submit = async () => {
    if (!键值.trim()) { message.error("请输入键"); return; }
    setSaving(true);
    try {
      await sysConfigApi.upsert({
        键: 键值.trim(),
        值: 值 === "" ? undefined : 值,
        是否加密,
        备注: 备注.trim() || undefined,
      });
      message.success("已保存"); onClose(); onSaved();
    } catch (e) {
      message.error(errMsg(e, "保存失败"));
    } finally { setSaving(false); }
  };

  return (
    <Drawer title={isEdit ? "编辑系统参数" : "新建系统参数"} width={560} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form layout="vertical">
        <Form.Item label="键" required>
          <Input value={键值} disabled={isEdit} placeholder="参数键名"
            onChange={(e) => set键值(e.target.value)} />
        </Form.Item>
        <Form.Item label="是否加密">
          <Switch checked={是否加密} onChange={set是否加密} />
        </Form.Item>
        <Form.Item label="值">
          <Input value={值} disabled={loading}
            placeholder={isEdit && 是否加密 ? "留空保留原值" : "参数值"}
            onChange={(e) => set值(e.target.value)} />
        </Form.Item>
        <Form.Item label="备注">
          <Input value={备注} placeholder="可选" onChange={(e) => set备注(e.target.value)} />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
