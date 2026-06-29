import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Modal, Popconfirm, Space, Table, Tree, message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { factoryMasterApi, type FactoryRow, type FactoryCategoryNode } from "../../api/factoryMaster";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "加工厂资料";
const ALL = "__ALL__";
const factories = masterApi("factories");

export default function FactoryMasterPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");

  const [cats, setCats] = useState<FactoryCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<FactoryRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<FactoryRow | null>(null); // null=不显示；ID=0 表示新增
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const 类别 = selKey === ALL ? undefined : selKey;

  const loadCats = useCallback(async () => {
    try { setCats(await factoryMasterApi.categories()); } catch { /* 忽略 */ }
  }, []);

  const loadRows = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await factoryMasterApi.list(类别, keyword.trim() || undefined, p, 50);
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载加工厂失败"); }
    finally { setLoading(false); }
  }, [canOpen, 类别, keyword]);

  useEffect(() => { if (canOpen) loadCats(); }, [canOpen, loadCats]);
  // 选中分类变化时重查(回到第1页)；关键字由搜索框显式触发，故 loadRows 不入依赖
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); loadRows(1); }, [selKey]);

  const treeData = useMemo(() => [{
    title: "全部加工厂", key: ALL,
    children: cats.map(c => ({ title: `${c.类别}（${c.数量}）`, key: c.类别 ?? "", isLeaf: true })),
  }], [cats]);

  const openCreate = () => {
    const init: FactoryRow = { ID: 0, 加工厂类别: 类别 };
    setEditing(init);
    form.resetFields();
    form.setFieldsValue(init);
  };
  const openEdit = async (r: FactoryRow) => {
    try {
      const full = await factories.get(r.ID) as Record<string, unknown>;
      setEditing(r);
      form.resetFields();
      form.setFieldsValue(full);
    } catch { message.error("加载加工厂详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await factories.update(editing.ID, v);
      else await factories.create(v);
      message.success("已保存");
      setEditing(null);
      await loadCats();
      await loadRows(page);
    } catch { message.error("保存失败"); }
    finally { setSaving(false); }
  };

  const del = async (r: FactoryRow) => {
    try {
      await factories.remove(r.ID);
      message.success("已删除");
      await loadCats();
      await loadRows(page);
    } catch { message.error("删除失败"); }
  };

  const columns = [
    { title: "加工厂编号", dataIndex: "加工厂编号", width: 120 },
    { title: "加工厂名称", dataIndex: "加工厂名称", width: 160 },
    { title: "加工厂类别", dataIndex: "加工厂类别", width: 110 },
    { title: "联系人", dataIndex: "联系人", width: 100 },
    { title: "手机", dataIndex: "手机", width: 120 },
    { title: "电话", dataIndex: "电话", width: 120 },
    { title: "传真", dataIndex: "传真", width: 120 },
    { title: "联系地址", dataIndex: "联系地址", width: 200 },
    { title: "付款方式", dataIndex: "付款方式", width: 120 },
    { title: "备注", dataIndex: "备注", width: 160 },
    {
      title: "操作", width: 120, fixed: "right" as const,
      render: (_: unknown, r: FactoryRow) => (
        <Space size="small">
          {canSave && <a onClick={() => openEdit(r)}><EditOutlined /></a>}
          {canDelete && (
            <Popconfirm title="确认删除该加工厂?" onConfirm={() => del(r)}>
              <a style={{ color: "#cf1322" }}><DeleteOutlined /></a>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"加工厂资料·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="加工厂资料" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      <div style={{ width: 220, flex: "0 0 220px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        <Tree
          treeData={treeData}
          selectedKeys={[selKey]}
          defaultExpandAll
          onSelect={keys => { if (keys.length) setSelKey(String(keys[0])); }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search
            placeholder="加工厂编号/名称/联系人/电话" allowClear style={{ width: 260 }}
            value={keyword} onChange={e => setKeyword(e.target.value)}
            onSearch={() => { setPage(1); loadRows(1); }}
          />
          {canSave && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
        </Space>
        <Table
          size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns}
          scroll={{ x: true }}
          pagination={{
            current: page, pageSize: 50, total, showSizeChanger: false,
            onChange: p => { setPage(p); loadRows(p); }, showTotal: t => `共 ${t} 条`,
          }}
        />
      </div>

      <Modal
        title={editing && editing.ID > 0 ? "编辑加工厂" : "新增加工厂"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="加工厂编号" label="加工厂编号" rules={[{ required: true, message: "请输入加工厂编号" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="加工厂名称" label="加工厂名称"><Input /></Form.Item>
          <Form.Item name="加工厂类别" label="加工厂类别"><Input /></Form.Item>
          <Form.Item name="联系人" label="联系人"><Input /></Form.Item>
          <Form.Item name="手机" label="手机"><Input /></Form.Item>
          <Form.Item name="电话" label="电话"><Input /></Form.Item>
          <Form.Item name="传真" label="传真"><Input /></Form.Item>
          <Form.Item name="联系地址" label="联系地址"><Input /></Form.Item>
          <Form.Item name="付款方式" label="付款方式"><Input /></Form.Item>
          <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
