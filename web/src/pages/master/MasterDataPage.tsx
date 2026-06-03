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
  const [form] = Form.useForm();

  const priceHidden = hidePrice(perms, cfg.menu);
  const fields = cfg.fields.filter(f => !(f.price && priceHidden));

  const load = useCallback(async () => {
    const r = await api.list(page, 10, keyword);
    setRows(r.items as Row[]); setTotal(r.total);
  }, [page, keyword, cfg.resource]);

  useEffect(() => { load(); }, [load]);

  const columns = [
    ...fields.map(f => {
      const isTag = /类别|类型/.test(f.name);
      const mono = !isTag && /编号|号|价|手机/.test(f.name);
      let render: ((v: unknown) => ReactNode) | undefined;
      if (isTag) render = (v: unknown) => (v == null || v === "") ? null : <Tag color={tagColor(String(v))} style={{ borderRadius: 6 }}>{String(v)}</Tag>;
      else if (mono) render = (v: unknown) => <span className="erp-num">{v == null ? "" : String(v)}</span>;
      return { title: f.label, dataIndex: f.name, key: f.name, render };
    }),
    {
      title: "操作", key: "_op", render: (_: unknown, row: Row) => (
        <Space>
          {cfg.detailLink && cfg.detailLink(row) && (
            <a onClick={() => nav(cfg.detailLink!(row)!)}>明细</a>
          )}
          <a onClick={() => { setEditing(row); form.setFieldsValue(row); }}>编辑</a>
          <Popconfirm title="确认删除?" onConfirm={async () => { await api.remove(row.id); message.success("已删除"); load(); }}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onSave = async () => {
    const v = await form.validateFields();
    if (editing && editing.id) await api.update(editing.id, v);
    else await api.create(v);
    message.success("已保存"); setEditing(null); form.resetFields(); load();
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
        </Space>
      }
    >
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns}
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
