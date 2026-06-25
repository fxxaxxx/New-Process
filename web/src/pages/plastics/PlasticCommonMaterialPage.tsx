import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message,
} from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined } from "@ant-design/icons";
import { plasticCommonMaterialApi, type PlasticCommonMaterialRow } from "../../api/plasticCommonMaterial";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PlasticMaterialPicker from "./PlasticMaterialPicker";

const MENU = "塑胶共用物料表";
const ALL_APPROVAL = "全部";
const crud = masterApi("plastic-common-materials");

export default function PlasticCommonMaterialPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  const [客户, set客户] = useState("");
  const [塑胶货号, set塑胶货号] = useState("");
  const [工模编号, set工模编号] = useState("");
  const [keyword, setKeyword] = useState("");
  const [审核情况, set审核情况] = useState(ALL_APPROVAL);

  const [rows, setRows] = useState<PlasticCommonMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<PlasticCommonMaterialRow | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const loadRows = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await plasticCommonMaterialApi.list({
        客户: 客户.trim() || undefined,
        塑胶货号: 塑胶货号.trim() || undefined,
        工模编号: 工模编号.trim() || undefined,
        keyword: keyword.trim() || undefined,
        审核情况: 审核情况 === ALL_APPROVAL ? undefined : 审核情况,
        page: p, size: 50,
      });
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载塑胶共用物料失败"); }
    finally { setLoading(false); }
  }, [canOpen, 客户, 塑胶货号, 工模编号, keyword, 审核情况]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRows(1); setPage(1); }, [canOpen]);

  const search = () => { setPage(1); loadRows(1); };

  const openCreate = () => {
    const init = { ID: 0, 塑胶货号: 塑胶货号.trim() || undefined, 客户: 客户.trim() || undefined } as PlasticCommonMaterialRow;
    setEditing(init); form.resetFields(); form.setFieldsValue(init);
  };
  const openEdit = async (r: PlasticCommonMaterialRow) => {
    try {
      const full = await crud.get(r.ID) as Record<string, unknown>;
      setEditing(r); form.resetFields(); form.setFieldsValue(full);
    } catch { message.error("加载详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await crud.update(editing.ID, v);
      else await crud.create(v);
      message.success("已保存"); setEditing(null); await loadRows(page);
    } catch { message.error("保存失败"); }
    finally { setSaving(false); }
  };

  const del = async (r: PlasticCommonMaterialRow) => {
    try { await crud.remove(r.ID); message.success("已删除"); await loadRows(page); }
    catch { message.error("删除失败"); }
  };

  const columns = [
    { title: "客户", dataIndex: "客户", width: 90 },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 110 },
    { title: "工模编号", dataIndex: "工模编号", width: 90 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "颜色", dataIndex: "颜色", width: 70 },
    { title: "色粉号", dataIndex: "色粉号", width: 90 },
    { title: "用料名称", dataIndex: "用料名称", width: 110 },
    { title: "加工内容", dataIndex: "加工内容", width: 110 },
    { title: "加工单价", dataIndex: "加工单价", width: 90, align: "right" as const, render: money },
    { title: "整啤净重", dataIndex: "整啤净重", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "原胶件单净重", dataIndex: "原胶件单净重", width: 110, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "整啤模腔数", dataIndex: "整啤模腔数", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "套数", dataIndex: "套数", width: 70, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "用量", dataIndex: "用量", width: 80, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "共用原料编号", dataIndex: "共用原料编号", width: 110 },
    { title: "审核", dataIndex: "调整审核", width: 70, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
    { title: "备注内容", dataIndex: "备注内容", width: 140 },
    {
      title: "操作", width: 100, fixed: "right" as const,
      render: (_: unknown, r: PlasticCommonMaterialRow) => (
        <Space size="small">
          {canSave && <a onClick={() => openEdit(r)}><EditOutlined /></a>}
          {canDelete && (
            <Popconfirm title="确认删除该行?" onConfirm={() => del(r)}>
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
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶共用物料表·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="塑胶共用物料表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Input placeholder="客户" allowClear value={客户} onChange={e => set客户(e.target.value)} style={{ width: 120 }} />
        <Input placeholder="塑胶货号" allowClear value={塑胶货号} onChange={e => set塑胶货号(e.target.value)} style={{ width: 130 }} />
        <Input placeholder="工模编号" allowClear value={工模编号} onChange={e => set工模编号(e.target.value)} style={{ width: 120 }} />
        <Input.Search placeholder="物料编号/名称/用料/共用原料" allowClear style={{ width: 240 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={search} />
        <Select value={审核情况} onChange={set审核情况} style={{ width: 110 }}
          options={[ALL_APPROVAL, "已审核", "未审核"].map(v => ({ value: v, label: v }))} />
        <Button type="primary" onClick={search}>查询</Button>
        {canSave && <Button icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
      </Space>
      <Table
        size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content" }}
        pagination={{ current: page, pageSize: 50, total, showSizeChanger: false,
          onChange: p => { setPage(p); loadRows(p); }, showTotal: t => `共 ${t} 条` }}
      />

      <Modal
        title={editing && editing.ID > 0 ? "编辑共用物料" : "新增共用物料"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="客户" label="客户"><Input /></Form.Item>
          <Form.Item name="塑胶货号" label="塑胶货号" rules={[{ required: true, message: "请输入塑胶货号" }]}><Input /></Form.Item>
          <Form.Item name="工模编号" label="工模编号"><Input /></Form.Item>
          <Form.Item name="物料编号" label="物料编号(选料回填名称/颜色)">
            <Input readOnly addonAfter={<a onClick={() => setPickerOpen(true)}>选料</a>} />
          </Form.Item>
          <Form.Item name="物料名称" label="物料名称"><Input /></Form.Item>
          <Form.Item name="颜色" label="颜色"><Input /></Form.Item>
          <Form.Item name="色粉号" label="色粉号"><Input /></Form.Item>
          <Form.Item name="用料名称" label="用料名称"><Input /></Form.Item>
          <Form.Item name="加工内容" label="加工内容"><Input /></Form.Item>
          {!priceHidden && (
            <Form.Item name="加工单价" label="加工单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          <Form.Item name="整啤净重" label="整啤净重"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="原胶件单净重" label="原胶件单净重"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="整啤模腔数" label="整啤模腔数"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="套数" label="套数"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="用量" label="用量"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="共用原料编号" label="共用原料编号"><Input /></Form.Item>
          <Form.Item name="备注内容" label="备注内容"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="工模表备注" label="工模表备注"><Input /></Form.Item>
          <Form.Item name="调整审核" hidden><Input /></Form.Item>
        </Form>
      </Modal>

      <PlasticMaterialPicker
        open={pickerOpen} onClose={() => setPickerOpen(false)}
        onPick={r => form.setFieldsValue({ 物料编号: r.物料编号, 物料名称: r.物料名称, 颜色: r.颜色 })}
      />
    </Card>
  );
}
