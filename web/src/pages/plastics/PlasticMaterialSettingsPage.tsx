import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { CloseOutlined, ReloadOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  plasticMaterialSettingsApi,
  type PlasticMaterialSettingRow,
} from "../../api/plasticMaterialSettings";

const MENU = "塑胶物料设置";

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;

interface EditForm {
  默认仓库?: string;
  损耗率?: number | null;
  备注?: string;
}

export default function PlasticMaterialSettingsPage() {
  const perms = usePerms();
  const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticMaterialSettingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<PlasticMaterialSettingRow | null>(null);
  // 双击选中的行,工具栏编辑/删除按钮对其生效
  const [selRow, setSelRow] = useState<PlasticMaterialSettingRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<EditForm>();

  const load = useCallback(async (p: number, s: number) => {
    setLoading(true);
    try {
      const r = await plasticMaterialSettingsApi.list(p, s, keyword.trim());
      setRows(r.items); setTotal(r.total);
      setSelRow(null); // 重新加载后清空选中行
    } catch (error) {
      message.error(errorMessage(error, "加载塑胶物料设置失败"));
    } finally { setLoading(false); }
  }, [keyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (canOpen) void load(1, size); }, [canOpen]);

  const openEdit = (row: PlasticMaterialSettingRow) => {
    form.setFieldsValue({
      默认仓库: row.默认仓库 ?? "",
      损耗率: row.损耗率 ?? null,
      备注: row.备注 ?? "",
    });
    setEditing(row);
  };

  const save = async () => {
    if (!editing || !canSave) return;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await plasticMaterialSettingsApi.save(editing.物料编号, {
        默认仓库: values.默认仓库?.trim() || null,
        损耗率: values.损耗率 ?? null,
        备注: values.备注?.trim() || null,
      });
      message.success(`塑胶物料 [${editing.物料编号}] 设置已保存`);
      setEditing(null);
      await load(page, size);
    } catch (error) {
      if ((error as { errorFields?: unknown }).errorFields) return;
      message.error(errorMessage(error, "保存塑胶物料设置失败"));
    } finally { setSaving(false); }
  };

  const remove = async (row: PlasticMaterialSettingRow) => {
    if (!canDelete) return;
    try {
      await plasticMaterialSettingsApi.remove(row.物料编号);
      message.success(`塑胶物料 [${row.物料编号}] 设置已删除`);
      setSelRow(null); // 删除成功后清空选中行
      await load(page, size);
    } catch (error) {
      message.error(errorMessage(error, "删除塑胶物料设置失败"));
    }
  };

  const columns: ColumnsType<PlasticMaterialSettingRow> = [
    { title: "物料编号", dataIndex: "物料编号", width: 130 },
    { title: "物料名称", dataIndex: "物料名称", width: 160 },
    { title: "规格", dataIndex: "规格", width: 120 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "默认仓库", dataIndex: "默认仓库", width: 130, render: v => v ?? "" },
    { title: "损耗率%", dataIndex: "损耗率", width: 100, align: "right", render: v => v ?? "" },
    { title: "备注", dataIndex: "备注", width: 180, render: v => v ?? "" },
    { title: "已设置", key: "set", width: 80, render: (_v, row) => row.ID ? <Tag color="success">是</Tag> : <Tag>否</Tag> },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  }

  return (
    <Card title="塑胶物料设置" variant="borderless" extra={
      <Space wrap>
        <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load(page, size)}>刷新</Button>
        <Button danger icon={<CloseOutlined />} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
      </Space>
    }>
      <div style={{ marginBottom: 12 }}>
        <Space wrap>
          <Input.Search
            placeholder="物料编号/名称/规格" allowClear style={{ width: 300 }}
            value={keyword} onChange={e => setKeyword(e.target.value)}
            onSearch={() => { setPage(1); void load(1, size); }}
          />
          <Button disabled={!selRow || !canSave} onClick={() => selRow && openEdit(selRow)} aria-label="编辑设置">编辑</Button>
          <Popconfirm title={`确认删除塑胶物料 [${selRow?.物料编号 ?? ""}] 的设置?`} disabled={!selRow?.ID || !canDelete} onConfirm={() => selRow && void remove(selRow)}>
            <Button danger disabled={!selRow?.ID || !canDelete} aria-label="删除设置">删除</Button>
          </Popconfirm>
          <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
            {selRow ? `已选中:${selRow.物料编号}` : "双击行选中后可编辑/删除"}
          </span>
        </Space>
      </div>
      <Table<PlasticMaterialSettingRow>
        rowKey="物料编号"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        onRow={(r) => ({
          onDoubleClick: () => setSelRow(r),
          // 虚拟行 ID 可空,统一用唯一的物料编号判断选中
          style: { cursor: "pointer", ...(selRow?.物料编号 === r.物料编号 ? { background: "#e6f4ff" } : {}) },
        })}
        scroll={{ x: 1150, y: "calc(100vh - 320px)" }}
        pagination={{
          current: page, pageSize: size, total, showSizeChanger: true,
          onChange: (p, s) => { setPage(p); setSize(s); void load(p, s); },
          showTotal: t => `共 ${t} 条`,
        }}
      />
      <Modal
        title={editing ? `塑胶物料设置 - ${editing.物料编号} ${editing.物料名称 ?? ""}` : ""}
        open={editing !== null}
        onOk={save}
        onCancel={() => setEditing(null)}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={520}
      >
        <Form form={form} layout="vertical" size="small">
          <Form.Item label="默认仓库" name="默认仓库" rules={[{ max: 80, message: "默认仓库不能超过 80 个字符" }]}>
            <Input />
          </Form.Item>
          <Form.Item label="损耗率(%)" name="损耗率">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="备注" name="备注" rules={[{ max: 500, message: "备注不能超过 500 个字符" }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
