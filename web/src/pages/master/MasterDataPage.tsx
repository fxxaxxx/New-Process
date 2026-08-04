import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tag, message } from "antd";
import { useNavigate } from "react-router-dom";
import { masterApi } from "../../api/master";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import type { MasterCfg } from "./configs";

type Row = Record<string, unknown> & { id: number };

const TAG_COLORS = ["blue", "green", "gold", "magenta", "purple", "cyan", "volcano", "geekblue"];
function tagColor(v: string) {
  let h = 0;
  for (const ch of v) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_COLORS[h % TAG_COLORS.length];
}

export default function MasterDataPage({ cfg }: { cfg: MasterCfg }) {
  const perms = usePerms();
  const nav = useNavigate();
  const api = masterApi(cfg.resource);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [selRow, setSelRow] = useState<Row | null>(null);
  const [form] = Form.useForm();

  const priceHidden = hidePrice(perms, cfg.menu);
  const fields = cfg.fields.filter(f => !(f.price && priceHidden));

  const load = useCallback(async () => {
    const r = await api.list(page, 10, keyword);
    setRows(r.items as Row[]); setTotal(r.total);
    setSelRow(null);
  }, [page, keyword, cfg.resource]);

  useEffect(() => { load(); }, [load]);

  // 选中行展示/删除提示用的主键字段:编号 > 名称 > 常见业务编号/名称 > id
  const rowLabel = (r: Row | null) => {
    if (!r) return "";
    const v = r.编号 ?? r.名称 ?? r.客户编号 ?? r.客户名称 ?? r.物料编号 ?? r.供应商编号
      ?? r.加工厂编号 ?? r.加工厂名称 ?? r.键 ?? r.id;
    return String(v);
  };

  const openEdit = (row: Row) => { setEditing(row); form.setFieldsValue(row); };
  const onDelete = async (row: Row) => {
    await api.remove(row.id);
    message.success("已删除");
    setSelRow(null);
    load();
  };

  const columns = fields.map(f => {
    const isTag = /类别|类型/.test(f.name);
    const mono = !isTag && /编号|号|价|手机/.test(f.name);
    let render: ((v: unknown) => ReactNode) | undefined;
    if (isTag) render = (v: unknown) => (v == null || v === "") ? null : <Tag color={tagColor(String(v))} style={{ borderRadius: 6 }}>{String(v)}</Tag>;
    else if (mono) render = (v: unknown) => <span className="erp-num">{v == null ? "" : String(v)}</span>;
    return { title: f.label, dataIndex: f.name, key: f.name, render };
  });

  const onSave = async () => {
    const v = await form.validateFields();
    if (editing && editing.id) await api.update(editing.id, v);
    else await api.create(v);
    message.success("已保存"); setEditing(null); form.resetFields(); setSelRow(null); load();
  };

  return (
    <Card
      title={cfg.title}
      variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder={`搜索${cfg.title}`} allowClear
            onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          <Button type="primary" onClick={() => { setEditing({ id: 0 } as Row); form.resetFields(); }}>
            新增
          </Button>
          {cfg.detailLink && (
            <Button
              disabled={!selRow || !cfg.detailLink(selRow)}
              onClick={() => selRow && nav(cfg.detailLink!(selRow!)!)}
            >明细</Button>
          )}
          <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>
          <Popconfirm title={`确认删除${selRow ? ` [${rowLabel(selRow)}]` : ""}?`} onConfirm={() => selRow && onDelete(selRow)}>
            <Button danger disabled={!selRow}>删除</Button>
          </Popconfirm>
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow ? `已选中:${rowLabel(selRow)}` : "双击行选中后可编辑/删除"}
          </span>
        </Space>
      }
    >
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        onRow={(r: Row) => ({
          onDoubleClick: () => setSelRow(r),
          style: { cursor: "pointer", ...(selRow?.id === r.id ? { background: "#e6f4ff" } : {}) },
        })}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <Modal open={!!editing} title={(editing && editing.id ? "编辑" : "新增") + cfg.title}
        onOk={onSave} onCancel={() => { setEditing(null); form.resetFields(); }} destroyOnHidden>
        <Form form={form} layout="vertical">
          {fields.map(f => (
            <Form.Item key={f.name} name={f.name} label={f.label}><Input /></Form.Item>
          ))}
        </Form>
      </Modal>
    </Card>
  );
}
