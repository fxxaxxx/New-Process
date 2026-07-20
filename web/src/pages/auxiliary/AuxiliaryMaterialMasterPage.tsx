import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Form, Input, Modal, Popconfirm, Select, Space, Table, Tree, message,
} from "antd";
import {
  CloseOutlined, DeleteOutlined, EditOutlined, ExportOutlined, PlusOutlined,
  PrinterOutlined, SearchOutlined, SettingOutlined, ToolOutlined,
} from "@ant-design/icons";
import { materialMasterApi, type MaterialCategoryNode } from "../../api/materialMaster";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { downloadCsv, printTable, type ExportCol } from "../../utils/tableExport";
import {
  AUXILIARY_MATERIAL_ALL,
  AUXILIARY_MATERIAL_DEFAULT_CATEGORY,
  buildAuxiliaryMaterialQuery,
  toAuxiliaryMaterialRow,
  type AuxiliaryMaterialRow,
} from "../../utils/auxiliaryMaterialMaster";

const MENU = "物料资料";
const materials = masterApi("materials");
const pageSize = 50;

type SortField = "辅料编号" | "辅料名称" | "规格" | "仓库位置";
type SearchField = SortField;
type SortOrder = "asc" | "desc";

const exportCols: ExportCol[] = [
  { title: "辅料编号", key: "辅料编号" },
  { title: "辅料名称", key: "辅料名称" },
  { title: "规格", key: "规格" },
  { title: "每单位数值", key: "每单位数值" },
  { title: "辅料计算使用单位", key: "辅料计算使用单位" },
  { title: "单位", key: "单位" },
  { title: "备注", key: "备注" },
  { title: "仓库位置", key: "仓库位置" },
];

export default function AuxiliaryMaterialMasterPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");

  const [cats, setCats] = useState<MaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(AUXILIARY_MATERIAL_DEFAULT_CATEGORY);
  const [keyword, setKeyword] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("辅料编号");
  const [sortField, setSortField] = useState<SortField>("辅料编号");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [rows, setRows] = useState<AuxiliaryMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<AuxiliaryMaterialRow | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const loadCats = useCallback(async () => {
    try { setCats(await materialMasterApi.categories()); } catch { /* 左树失败不阻断主表 */ }
  }, []);

  const loadRows = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const q = buildAuxiliaryMaterialQuery({
        category: selKey,
        keyword,
        page: p,
        size: pageSize,
      });
      const r = await materialMasterApi.list(q.类别, q.keyword, q.page, q.size);
      setRows(r.items.map(toAuxiliaryMaterialRow));
      setTotal(r.total);
    } catch {
      message.error("加载辅料资料失败");
    } finally {
      setLoading(false);
    }
  }, [canOpen, keyword, selKey]);

  useEffect(() => { if (canOpen) loadCats(); }, [canOpen, loadCats]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); loadRows(1); }, [selKey]);

  const treeData = useMemo(() => {
    const auxiliaryCats = cats.filter(c => (c.类别 ?? "").includes("辅料"));
    const children = auxiliaryCats.length > 0
      ? auxiliaryCats.map(c => ({
        title: `[8]${c.类别 ?? AUXILIARY_MATERIAL_DEFAULT_CATEGORY}(${c.数量})`,
        key: c.类别 ?? AUXILIARY_MATERIAL_DEFAULT_CATEGORY,
        isLeaf: true,
      }))
      : [{
        title: `[8]${AUXILIARY_MATERIAL_DEFAULT_CATEGORY}(0)`,
        key: AUXILIARY_MATERIAL_DEFAULT_CATEGORY,
        isLeaf: true,
      }];
    return [{
      title: `<所有物料>(${total})`,
      key: AUXILIARY_MATERIAL_ALL,
      children,
    }];
  }, [cats, total]);

  const sortedRows = useMemo(() => {
    const list = [...rows];
    list.sort((a, b) => {
      const av = String(a[sortField] ?? "");
      const bv = String(b[sortField] ?? "");
      return sortOrder === "asc" ? av.localeCompare(bv, "zh-Hans-CN") : bv.localeCompare(av, "zh-Hans-CN");
    });
    return list;
  }, [rows, sortField, sortOrder]);

  const searchPlaceholder = useMemo(() => {
    if (searchField === "辅料编号") return "按辅料编号查询";
    if (searchField === "辅料名称") return "按辅料名称查询";
    if (searchField === "仓库位置") return "按仓库位置查询";
    return "按规格查询";
  }, [searchField]);

  const searchNow = () => { setPage(1); loadRows(1); };

  const openCreate = () => {
    const category = selKey === AUXILIARY_MATERIAL_ALL ? AUXILIARY_MATERIAL_DEFAULT_CATEGORY : selKey;
    const init: AuxiliaryMaterialRow = { ID: 0, 物料类别: category };
    setEditing(init);
    form.resetFields();
    form.setFieldsValue({ 物料类别: category });
  };

  const openEdit = async (r: AuxiliaryMaterialRow) => {
    try {
      const full = await materials.get(r.ID) as Record<string, unknown>;
      setEditing(r);
      form.resetFields();
      form.setFieldsValue(full);
    } catch {
      message.error("加载辅料详情失败");
    }
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await materials.update(editing.ID, values);
      else await materials.create(values);
      message.success("已保存");
      setEditing(null);
      await loadCats();
      await loadRows(page);
    } catch {
      message.error("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const del = async (r: AuxiliaryMaterialRow) => {
    try {
      await materials.remove(r.ID);
      message.success("已删除");
      await loadCats();
      await loadRows(page);
    } catch {
      message.error("删除失败");
    }
  };

  const tableColumns = [
    { title: "辅料编号", dataIndex: "辅料编号", width: 130 },
    { title: "辅料名称", dataIndex: "辅料名称", width: 230 },
    { title: "规格", dataIndex: "规格", width: 130 },
    { title: "每单位数值", dataIndex: "每单位数值", width: 120 },
    { title: "辅料计算使用单位", dataIndex: "辅料计算使用单位", width: 150 },
    { title: "单位", dataIndex: "单位", width: 80 },
    { title: "备注", dataIndex: "备注", width: 220 },
    { title: "仓库位置", dataIndex: "仓库位置", width: 160 },
    {
      title: "操作", width: 110, fixed: "right" as const,
      render: (_: unknown, r: AuxiliaryMaterialRow) => (
        <Space size="small">
          {canSave && <a onClick={() => openEdit(r)}><EditOutlined /></a>}
          {canDelete && (
            <Popconfirm title="确认删除该辅料?" onConfirm={() => del(r)}>
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
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"物料资料·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="辅料资料" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      <div style={{ width: 240, flex: "0 0 240px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        <Tree
          treeData={treeData}
          selectedKeys={[selKey]}
          defaultExpandAll
          onSelect={keys => { if (keys.length) setSelKey(String(keys[0])); }}
        />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <span style={{ color: "#1677ff", fontWeight: 600 }}>查询结果：{total}</span>
          <span>排序方式：</span>
          <Select<SortField>
            value={sortField}
            onChange={setSortField}
            style={{ width: 130 }}
            options={[
              { value: "辅料编号", label: "辅料编号" },
              { value: "辅料名称", label: "辅料名称" },
              { value: "规格", label: "规格" },
              { value: "仓库位置", label: "仓库位置" },
            ]}
          />
          <Select<SortOrder>
            value={sortOrder}
            onChange={setSortOrder}
            style={{ width: 110 }}
            options={[
              { value: "asc", label: "由小到大" },
              { value: "desc", label: "由大到小" },
            ]}
          />
          <Button disabled>添加行</Button>
          <Button disabled>删除行</Button>
        </Space>

        <Space style={{ marginBottom: 12 }} wrap>
          <Button icon={<ToolOutlined />} disabled>类别操作</Button>
          <span>请选择条件：</span>
          <Select<SearchField>
            value={searchField}
            onChange={setSearchField}
            style={{ width: 130 }}
            options={[
              { value: "辅料编号", label: "辅料编号" },
              { value: "辅料名称", label: "辅料名称" },
              { value: "规格", label: "规格" },
              { value: "仓库位置", label: "仓库位置" },
            ]}
          />
          <Input.Search
            placeholder={searchPlaceholder}
            allowClear
            style={{ width: 280 }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onSearch={searchNow}
          />
          <Button icon={<SearchOutlined />} onClick={searchNow}>查询</Button>
          <Button icon={<SearchOutlined />} onClick={searchNow}>精确查询</Button>
          <Button icon={<ToolOutlined />} disabled>物料操作</Button>
          <Button icon={<SettingOutlined />} disabled>表格设置</Button>
          <Button icon={<ExportOutlined />} onClick={() => downloadCsv("辅料资料.csv", exportCols, sortedRows as unknown as Record<string, unknown>[])}>导出EXCEL</Button>
          <Button icon={<PrinterOutlined />} onClick={() => printTable("辅料资料", exportCols, sortedRows as unknown as Record<string, unknown>[])}>打印</Button>
          {canSave && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
          <Button danger icon={<CloseOutlined />} onClick={() => window.history.back()}>关闭</Button>
        </Space>

        <Table
          size="small"
          rowKey="ID"
          loading={loading}
          dataSource={sortedRows}
          columns={tableColumns}
          scroll={{ x: 1350 }}
          onRow={r => ({ onDoubleClick: () => { if (canSave) openEdit(r); } })}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: false,
            onChange: p => { setPage(p); loadRows(p); },
            showTotal: t => `共 ${t} 条`,
          }}
        />
      </div>

      <Modal
        title={editing && editing.ID > 0 ? "编辑辅料资料" : "新增辅料资料"}
        open={!!editing}
        onCancel={() => setEditing(null)}
        onOk={submit}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="物料编号" label="辅料编号" rules={[{ required: true, message: "请输入辅料编号" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="物料名称" label="辅料名称"><Input /></Form.Item>
          <Form.Item name="物料类别" label="类别"><Input /></Form.Item>
          <Form.Item name="规格" label="规格"><Input /></Form.Item>
          <Form.Item name="码换算" label="每单位数值"><Input /></Form.Item>
          <Form.Item name="单位" label="辅料计算使用单位/单位"><Input /></Form.Item>
          <Form.Item name="仓库位置" label="仓库位置"><Input /></Form.Item>
          <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="款号" hidden><Input /></Form.Item>
          <Form.Item name="货币" hidden><Input /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
