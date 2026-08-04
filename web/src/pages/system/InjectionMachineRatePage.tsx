import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, message } from "antd";
import { injectionMachineRateApi, type InjectionMachineRate } from "../../api/systemMasters";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "啤机机型啤工表";

function errMsg(e: unknown, fallback: string): string {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

// 啤机机型啤工表:机型 + 啤工价主数据(工模表.啤机机型 引用)
export default function InjectionMachineRatePage() {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);
  const [rows, setRows] = useState<InjectionMachineRate[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<InjectionMachineRate | null>(null);
  const [selRow, setSelRow] = useState<InjectionMachineRate | null>(null);
  const [form] = Form.useForm();

  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await injectionMachineRateApi.list(page, 10, keyword);
      setRows(r.items); setTotal(r.total);
      setSelRow(null);
    } catch { message.error("加载啤机机型啤工表失败"); }
    finally { setLoading(false); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    const v = await form.validateFields();
    try {
      if (editing && editing.id) await injectionMachineRateApi.update(editing.id, v);
      else await injectionMachineRateApi.create(v);
      message.success("已保存"); setEditing(null); form.resetFields(); setSelRow(null); load();
    } catch (e) { message.error(errMsg(e, "保存失败")); }
  };

  const openEdit = (row: InjectionMachineRate) => { setEditing(row); form.setFieldsValue(row); };
  const onDelete = async (row: InjectionMachineRate) => {
    try {
      await injectionMachineRateApi.remove(row.id);
      message.success("已删除");
      setSelRow(null);
      load();
    } catch (e) { message.error(errMsg(e, "删除失败")); }
  };

  const columns = [
    { title: "啤机机型", dataIndex: "啤机机型", render: (v: string) => <span className="erp-num">{v}</span> },
    ...(priceHidden ? [] : [{
      title: "啤工价", dataIndex: "啤工价",
      render: (v: number | null) => (v == null ? "" : <span className="erp-num">{v}</span>),
    }]),
    { title: "备注", dataIndex: "备注" },
  ];

  return (
    <Card title="啤机机型啤工表" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索机型/备注" allowClear
            onSearch={(v) => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          {canSave && (
            <Button type="primary" onClick={() => { setEditing({ id: 0 }); form.resetFields(); }}>新增</Button>
          )}
          {canSave && <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>}
          {canDelete && (
            <Popconfirm title={`确认删除该机型${selRow ? ` [${selRow.啤机机型}]` : ""}?`} onConfirm={() => selRow && void onDelete(selRow)}>
              <Button danger disabled={!selRow}>删除</Button>
            </Popconfirm>
          )}
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow ? `已选中:${selRow.啤机机型}` : "双击行选中后可编辑/删除"}
          </span>
        </Space>
      }>
      <Table rowKey="id" size="middle" loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        onRow={(r: InjectionMachineRate) => ({
          onDoubleClick: () => setSelRow(r),
          style: { cursor: "pointer", ...(selRow && selRow.id === r.id ? { background: "#e6f4ff" } : {}) },
        })}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: (t) => `共 ${t} 条` }} />
      <Modal open={!!editing} title={(editing && editing.id ? "编辑" : "新增") + "啤机机型"}
        onOk={onSave} onCancel={() => { setEditing(null); form.resetFields(); }} destroyOnHidden>
        <Form form={form} layout="vertical">
          <Form.Item name="啤机机型" label="啤机机型" rules={[{ required: true, message: "请输入啤机机型" }, { max: 30 }]}>
            <Input placeholder="如 120T / 168T" />
          </Form.Item>
          {!priceHidden && (
            <Form.Item name="啤工价" label="啤工价">
              <InputNumber min={0} precision={4} style={{ width: "100%" }} />
            </Form.Item>
          )}
          <Form.Item name="备注" label="备注" rules={[{ max: 200 }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
