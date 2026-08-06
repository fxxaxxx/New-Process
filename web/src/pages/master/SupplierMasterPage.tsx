import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Table, Tree, message,
} from "antd";
import type { TreeDataNode } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "供应商资料"; // 供应商权限菜单名
const CAT_MENU = "供应商类别"; // 类别权限菜单名
const ALL = "__ALL__"; // 左侧"全部供应商"根节点 key
const suppliers = masterApi("suppliers");
const supplierCategories = masterApi("supplier-categories");

// 行数据：后端按 camelCase 序列化 id，这里统一归一化为 ID
type Row = Record<string, unknown> & { ID: number };

// 左树类别节点。
// 供应商类别主数据实际只有 类别/名称 两列（无 编号/父级，实体 src/ErpApi/Data/Entities/供应商类别.cs），
// 故树只做一级：供应商行按 供应商类别 ∈ {类别, 名称} 精确匹配归属（存量数据存的可能是旧编号，匹配不上时仅出现在"全部供应商"下）。
interface CatInfo {
  key: string;          // 树节点 key（主数据 id）
  display: string;      // 展示名 = 名称 ?? 类别
  matchValues: string[]; // 参与归属匹配的值（类别、名称，去空）
  filterValue: string;  // 新增供应商时默认带入的类别值 = 类别 ?? 名称
}

export default function SupplierMasterPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const canCatSave = can(perms, CAT_MENU, "保存");

  const [cats, setCats] = useState<Row[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL); // 左侧选中的类别节点 key（ALL=全部）
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  // 双击行选中，工具栏"编辑/删除"作用于选中行
  const [selRow, setSelRow] = useState<Row | null>(null);

  const [editing, setEditing] = useState<Row | null>(null); // null=不显示；ID=0 表示新增
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const loadCats = useCallback(async () => {
    try {
      const r = await supplierCategories.list(1, 500);
      setCats((r.items as (Row & { id?: number })[]).map(x => ({ ...x, ID: x.ID ?? x.id ?? 0 })));
    } catch { /* 无类别权限等：左侧树留空，供应商区仍可用 */ }
  }, []);

  // 一次拉全量：类别过滤/关键字搜索/各类别供应商数统计均在前端做（无专用统计端点）
  const loadRows = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await suppliers.list(1, 2000);
      setRows((r.items as (Row & { id?: number })[]).map(x => ({ ...x, ID: x.ID ?? x.id ?? 0 })));
      setSelRow(null);
    } catch { message.error("加载供应商失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { if (canOpen) { void loadCats(); void loadRows(); } }, [canOpen, loadCats, loadRows]);

  // 类别主数据 → CatInfo（一级，无父子组装）
  const catInfos = useMemo<CatInfo[]>(() => {
    const list: CatInfo[] = [];
    for (const c of cats) {
      const 类别 = String(c.类别 ?? "").trim();
      const 名称 = String(c.名称 ?? "").trim();
      const display = 名称 || 类别;
      if (!display) continue;
      list.push({
        key: String(c.ID),
        display,
        matchValues: [类别, 名称].filter(v => v !== ""),
        filterValue: 类别 || 名称,
      });
    }
    return list;
  }, [cats]);

  // 供应商类别值 → 类别节点 key（用于归属统计与过滤）
  const catKeyByValue = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catInfos) for (const v of c.matchValues) if (!m.has(v)) m.set(v, c.key);
    return m;
  }, [catInfos]);

  // 每个类别的供应商数（左侧名称后括号展示）
  const countByCat = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = catKeyByValue.get(String(r.供应商类别 ?? ""));
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  }, [rows, catKeyByValue]);

  const treeData = useMemo<TreeDataNode[]>(() => [{
    title: `全部供应商（${rows.length}）`,
    key: ALL,
    children: catInfos.map(c => ({
      title: `${c.display}（${countByCat.get(c.key) ?? 0}）`,
      key: c.key,
      isLeaf: true,
    })),
  }], [catInfos, countByCat, rows.length]);

  const selCat = selKey === ALL ? undefined : catInfos.find(c => c.key === selKey);

  // 类别值 → 展示名（网格"类别"列把旧编号尽量翻译成类别名称）
  const catDisplayByValue = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of catInfos) for (const v of c.matchValues) if (!m.has(v)) m.set(v, c.display);
    return m;
  }, [catInfos]);

  // 右侧供应商：按选中类别（精确匹配）+ 关键字（编号/名称/联系人）前端过滤
  const filtered = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    return rows.filter(r => {
      if (selCat && !selCat.matchValues.includes(String(r.供应商类别 ?? ""))) return false;
      if (!kw) return true;
      return [r.供应商编号, r.供应商名称, r.联系人].some(v => String(v ?? "").toLowerCase().includes(kw));
    });
  }, [rows, selCat, keyword]);

  const openCreate = () => {
    setEditing({ ID: 0 });
    form.resetFields();
    // 新增默认：类别带当前左侧选中类别
    form.setFieldsValue({ 供应商类别: selCat?.filterValue });
  };
  const openEdit = async (r: Row) => {
    try {
      const full = await suppliers.get(r.ID);
      setEditing(r);
      form.resetFields();
      form.setFieldsValue(full);
    } catch { message.error("加载供应商详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await suppliers.update(editing.ID, v);
      else await suppliers.create(v);
      message.success("已保存");
      setEditing(null);
      setSelRow(null);
      await loadCats();
      await loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    }
    finally { setSaving(false); }
  };

  const del = async (r: Row) => {
    try {
      await suppliers.remove(r.ID);
      message.success("已删除");
      setSelRow(null);
      await loadCats();
      await loadRows();
    } catch { message.error("删除失败"); }
  };

  // 类别主数据无父级列，"新增同级/子类别"均创建为一级类别（按钮保留与物料资料页一致的交互）
  const openCatCreate = () => { setCatName(""); setCatModalOpen(true); };
  const submitCat = async () => {
    const name = catName.trim();
    if (!name) return;
    setCatSaving(true);
    try {
      // 类别 与 名称 同值：供应商资料.供应商类别 用 类别 值过滤（同物料类别"编号=名称"约定）
      await supplierCategories.create({ 类别: name, 名称: name });
      message.success("类别已保存");
      setCatModalOpen(false);
      await loadCats();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "类别保存失败");
    }
    finally { setCatSaving(false); }
  };

  const columns = [
    { title: "供应商编号", dataIndex: "供应商编号", width: 110 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 200 },
    {
      title: "类别", dataIndex: "供应商类别", width: 100,
      render: (v?: unknown) => catDisplayByValue.get(String(v ?? "")) ?? (v ? String(v) : ""),
    },
    { title: "联系人", dataIndex: "联系人", width: 90 },
    { title: "手机", dataIndex: "手机", width: 120 },
    { title: "电话", dataIndex: "电话", width: 130 },
    { title: "付款方式", dataIndex: "付款方式", width: 90 },
    { title: "备注", dataIndex: "备注", width: 180 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"供应商资料·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="供应商资料" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      {/* 左：供应商类别树（一级） */}
      <div style={{ width: 220, flex: "0 0 220px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        {canCatSave && (
          <Space size={4} style={{ marginBottom: 4 }} wrap>
            <Button size="small" disabled={!selCat} onClick={openCatCreate}>新增同级类别</Button>
            <Button size="small" onClick={openCatCreate}>新增子类别</Button>
          </Space>
        )}
        <Tree
          key={treeData[0]?.children?.length ?? 0}
          treeData={treeData}
          selectedKeys={[selKey]}
          defaultExpandAll
          onSelect={keys => { if (keys.length) setSelKey(String(keys[0])); }}
        />
      </div>

      {/* 右：供应商网格 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search
            placeholder="供应商编号/名称/联系人" allowClear style={{ width: 240 }}
            value={keyword} onChange={e => setKeyword(e.target.value)}
            onSearch={v => setKeyword(v)}
          />
          {canSave && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
          {canSave && (
            <Button icon={<EditOutlined />} disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>
          )}
          {canDelete && (
            <Popconfirm
              title={`确认删除供应商${selRow ? ` ${selRow.供应商编号 ?? ""} ${selRow.供应商名称 ?? ""}` : ""}?`}
              onConfirm={() => selRow && del(selRow)}
            >
              <Button danger icon={<DeleteOutlined />} disabled={!selRow}>删除</Button>
            </Popconfirm>
          )}
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow
              ? `已选中：${selRow.供应商编号 ?? ""} ${selRow.供应商名称 ?? ""}`
              : "双击行选中后可编辑/删除"}
          </span>
        </Space>
        <Table
          size="small" rowKey="ID" loading={loading} dataSource={filtered} columns={columns}
          scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
          onRow={(r: Row) => ({
            onDoubleClick: () => setSelRow(r),
            style: { cursor: "pointer", ...(selRow?.ID === r.ID ? { background: "#e6f4ff" } : {}) },
          })}
          pagination={{ pageSize: 50, showSizeChanger: false, showTotal: t => `共 ${t} 条` }}
        />
      </div>

      {/* 供应商表单（新增/编辑）。
          注意：职务/传真/邮政编码/电子邮箱 当前后端实体（供应商资料.cs）未持久化，保存时会被忽略，字段先按旧系统说明书保留 */}
      <Modal
        title={editing && editing.ID > 0 ? "编辑供应商" : "新增供应商"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose width={760}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="供应商编号" label="供应商编号" rules={[{ required: true, message: "请输入供应商编号" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="供应商名称" label="供应商名称" rules={[{ required: true, message: "请输入供应商名称" }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="供应商类别" label="供应商类别">
                <Select
                  allowClear showSearch optionFilterProp="label"
                  options={catInfos.map(c => ({ value: c.filterValue, label: c.display }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="联系人" label="联系人"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="职务" label="职务"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="手机" label="手机"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="电话" label="电话"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="传真" label="传真"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="电子邮箱" label="电子邮箱"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="邮政编码" label="邮政编码"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="付款方式" label="付款方式"><Input /></Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="货币" label="货币"><Input /></Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="联系地址" label="联系地址"><Input /></Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 新增类别弹窗（类别/名称 同值，一级） */}
      <Modal
        title="新增供应商类别"
        open={catModalOpen} onCancel={() => setCatModalOpen(false)} onOk={submitCat}
        confirmLoading={catSaving} destroyOnClose okButtonProps={{ disabled: !catName.trim() }}
      >
        <Input
          placeholder="类别名称" value={catName} maxLength={20}
          onChange={e => setCatName(e.target.value)} onPressEnter={submitCat}
        />
      </Modal>
    </Card>
  );
}
