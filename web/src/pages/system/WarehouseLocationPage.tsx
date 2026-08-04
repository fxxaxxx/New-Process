import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Popconfirm, Space, Table, message } from "antd";
import { warehouseLocationApi, type WarehouseLocation } from "../../api/systemMasters";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "仓库位置设置";

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

// 仓库位置设置:仓库/仓位主数据(物料资料.仓位号 引用)
export default function WarehouseLocationPage() {
  const perms = usePerms();
  const [rows, setRows] = useState<WarehouseLocation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<WarehouseLocation | null>(null);
  const [selRow, setSelRow] = useState<WarehouseLocation | null>(null);
  const [form] = Form.useForm();

  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await warehouseLocationApi.list(page, 10, keyword);
      setRows(r.items); setTotal(r.total);
      setSelRow(null);
    } catch { message.error("加载仓库位置失败"); }
    finally { setLoading(false); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing && editing.id) await warehouseLocationApi.update(editing.id, v);
      else await warehouseLocationApi.create(v);
      message.success("已保存"); setEditing(null); form.resetFields(); setSelRow(null); load();
    } catch (e) { message.error(errMsg(e, "保存失败")); }
  };

  const openEdit = (row: WarehouseLocation) => { setEditing(row); form.setFieldsValue(row); };
  const onDelete = async (row: WarehouseLocation) => {
    try {
      await warehouseLocationApi.remove(row.id);
      message.success("已删除");
      setSelRow(null);
      load();
    } catch (e) { message.error(errMsg(e, "删除失败")); }
  };

  const columns = [
    { title: "编号", dataIndex: "编号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "名称", dataIndex: "名称" },
    { title: "备注", dataIndex: "备注" },
  ];

  return (
    <Card title="仓库位置设置" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索编号/名称/备注" allowClear
            onSearch={(v) => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          {canSave && (
            <Button type="primary" onClick={() => { setEditing({ id: 0 }); form.resetFields(); }}>新增</Button>
          )}
          {canSave && <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>}
          {canDelete && (
            <Popconfirm title={`确认删除该仓库位置${selRow ? ` [${selRow.编号}]` : ""}?`} onConfirm={() => selRow && void onDelete(selRow)}>
              <Button danger disabled={!selRow}>删除</Button>
            </Popconfirm>
          )}
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow ? `已选中:${selRow.编号}` : "双击行选中后可编辑/删除"}
          </span>
        </Space>
      }>
      <Table rowKey="id" size="middle" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        onRow={(r: WarehouseLocation) => ({
          onDoubleClick: () => setSelRow(r),
          style: { cursor: "pointer", ...(selRow && selRow.id === r.id ? { background: "#e6f4ff" } : {}) },
        })}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: (t) => `共 ${t} 条` }} />
      <Modal open={!!editing} title={(editing && editing.id ? "编辑" : "新增") + "仓库位置"}
        onOk={onSave} onCancel={() => { setEditing(null); form.resetFields(); }} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="编号" label="编号" rules={[{ required: true, message: "请输入编号" }, { max: 20 }]}>
            <Input placeholder="如 A仓 / A-01" />
          </Form.Item>
          <Form.Item name="名称" label="名称" rules={[{ max: 60 }]}>
            <Input />
          </Form.Item>
          <Form.Item name="备注" label="备注" rules={[{ max: 200 }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
