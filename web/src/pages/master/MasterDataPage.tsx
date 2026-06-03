import { useCallback, useEffect, useState } from "react";
import { Button, Form, Input, Modal, Popconfirm, Space, Table, message } from "antd";
import { masterApi } from "../../api/master";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import type { MasterCfg } from "./configs";

type Row = Record<string, unknown> & { ID: number };

export default function MasterDataPage({ cfg }: { cfg: MasterCfg }) {
  const perms = usePerms();
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
    ...fields.map(f => ({ title: f.label, dataIndex: f.name, key: f.name })),
    {
      title: "操作", key: "_op", render: (_: unknown, row: Row) => (
        <Space>
          <a onClick={() => { setEditing(row); form.setFieldsValue(row); }}>编辑</a>
          <Popconfirm title="确认删除?" onConfirm={async () => { await api.remove(row.ID); message.success("已删除"); load(); }}>
            <a>删除</a>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const onSave = async () => {
    const v = await form.validateFields();
    if (editing && editing.ID) await api.update(editing.ID, v);
    else await api.create(v);
    message.success("已保存"); setEditing(null); form.resetFields(); load();
  };

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Input.Search placeholder="搜索" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 240 }} />
        <Button type="primary" onClick={() => { setEditing({ ID: 0 } as Row); form.resetFields(); }}>新增</Button>
      </Space>
      <Table rowKey="ID" dataSource={rows} columns={columns}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage }} />
      <Modal open={!!editing} title={cfg.title} onOk={onSave} onCancel={() => { setEditing(null); form.resetFields(); }} destroyOnHidden>
        <Form form={form} layout="vertical">
          {fields.map(f => (
            <Form.Item key={f.name} name={f.name} label={f.label}><Input /></Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
}
