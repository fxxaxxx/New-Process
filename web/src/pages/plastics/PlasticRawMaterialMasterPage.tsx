import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tree, message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { plasticRawMaterialMasterApi, type PlasticRawMaterialRow, type PlasticRawMaterialCategoryNode } from "../../api/plasticRawMaterialMaster";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "塑胶原料资料表";
const ALL = "__ALL__";
const plasticRaws = masterApi("plastic-raw-materials");

export default function PlasticRawMaterialMasterPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  const [cats, setCats] = useState<PlasticRawMaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<PlasticRawMaterialRow | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const 类别 = selKey === ALL ? undefined : selKey;

  const loadCats = useCallback(async () => {
    try { setCats(await plasticRawMaterialMasterApi.categories()); } catch { /* 忽略 */ }
  }, []);

  const loadRows = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await plasticRawMaterialMasterApi.list(类别, keyword.trim() || undefined, p, 50);
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载塑胶原料失败"); }
    finally { setLoading(false); }
  }, [canOpen, 类别, keyword]);

  useEffect(() => { if (canOpen) loadCats(); }, [canOpen, loadCats]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); loadRows(1); }, [selKey]);

  const treeData = useMemo(() => [{
    title: "全部塑胶原料", key: ALL,
    children: cats.map(c => ({ title: `${c.类别}（${c.数量}）`, key: c.类别 ?? "", isLeaf: true })),
  }], [cats]);

  const openCreate = () => {
    const init: PlasticRawMaterialRow = { ID: 0, 物料类别: 类别 };
    setEditing(init);
    form.resetFields();
    form.setFieldsValue(init);
  };
  const openEdit = async (r: PlasticRawMaterialRow) => {
    try {
      const full = await plasticRaws.get(r.ID) as Record<string, unknown>;
      setEditing(r);
      form.resetFields();
      form.setFieldsValue(full);
    } catch { message.error("加载塑胶原料详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await plasticRaws.update(editing.ID, v);
      else await plasticRaws.create(v);
      message.success("已保存");
      setEditing(null);
      await loadCats();
      await loadRows(page);
    } catch { message.error("保存失败"); }
    finally { setSaving(false); }
  };

  const del = async (r: PlasticRawMaterialRow) => {
    try {
      await plasticRaws.remove(r.ID);
      message.success("已删除");
      await loadCats();
      await loadRows(page);
    } catch { message.error("删除失败"); }
  };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "类别", dataIndex: "物料类别", width: 90 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "颜色", dataIndex: "颜色", width: 70 },
    { title: "商品名称", dataIndex: "商品名称", width: 130 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "单价", dataIndex: "单价", width: 90, align: "right" as const, render: money },
    { title: "销售价", dataIndex: "销售价", width: 90, align: "right" as const, render: money },
    { title: "起订量", dataIndex: "起订量", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "安全库存", dataIndex: "安全库存", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "库存", dataIndex: "库存", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "供应商", dataIndex: "供应商名称", width: 130 },
    { title: "备注", dataIndex: "备注", width: 150 },
    {
      title: "操作", width: 100, fixed: "right" as const,
      render: (_: unknown, r: PlasticRawMaterialRow) => (
        <Space size="small">
          {canSave && <a onClick={() => openEdit(r)}><EditOutlined /></a>}
          {canDelete && (
            <Popconfirm title="确认删除该塑胶原料?" onConfirm={() => del(r)}>
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
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶原料资料表·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="塑胶原料资料表" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
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
            placeholder="物料编号/名称/规格/颜色/商品名称/供应商" allowClear style={{ width: 300 }}
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
        title={editing && editing.ID > 0 ? "编辑塑胶原料" : "新增塑胶原料"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="物料编号" label="物料编号" rules={[{ required: true, message: "请输入物料编号" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="物料名称" label="物料名称"><Input /></Form.Item>
          <Form.Item name="物料类别" label="类别"><Input /></Form.Item>
          <Form.Item name="规格" label="规格"><Input /></Form.Item>
          <Form.Item name="颜色" label="颜色"><Input /></Form.Item>
          <Form.Item name="商品名称" label="商品名称"><Input /></Form.Item>
          <Form.Item name="单位" label="单位"><Input /></Form.Item>
          <Form.Item name="仓位号" label="仓位号"><Input /></Form.Item>
          {!priceHidden && (
            <>
              <Form.Item name="单价" label="单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="销售价" label="销售价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            </>
          )}
          <Form.Item name="起订量" label="起订量"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="安全库存" label="安全库存"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="供应商编号" label="供应商编号"><Input /></Form.Item>
          <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="款号" hidden><Input /></Form.Item>
          <Form.Item name="货币" hidden><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
