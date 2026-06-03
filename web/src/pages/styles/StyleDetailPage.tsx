import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Button, Card, Descriptions, Form, Input, InputNumber, Modal, Popconfirm,
  Space, Table, Tabs, Tag, message,
} from "antd";
import { ArrowLeftOutlined, PlusOutlined } from "@ant-design/icons";
import { stylesApi, type StyleColor, type StyleFull } from "../../api/styles";
import { masterApi } from "../../api/master";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "款号资料";

// 颜色 Tab：整组编辑后一次保存
function ColorsTab({ 款号, colors, onSaved }: { 款号: string; colors: StyleColor[]; onSaved: () => void }) {
  const [rows, setRows] = useState<StyleColor[]>(colors);
  useEffect(() => setRows(colors), [colors]);
  const set = (i: number, k: keyof StyleColor, v: string) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const save = async () => {
    await stylesApi.saveColors(款号, rows.filter(r => r.颜色名称));
    message.success("颜色已保存"); onSaved();
  };
  return (
    <div>
      <Table size="small" rowKey={(_r, i) => String(i)} pagination={false} dataSource={rows}
        columns={[
          { title: "颜色编号", render: (_v: unknown, r: StyleColor, i: number) => <Input value={r.颜色编号 ?? ""} onChange={e => set(i, "颜色编号", e.target.value)} /> },
          { title: "颜色名称", render: (_v: unknown, r: StyleColor, i: number) => <Input value={r.颜色名称 ?? ""} onChange={e => set(i, "颜色名称", e.target.value)} /> },
          { title: "", width: 60, render: (_v: unknown, _r: StyleColor, i: number) => <a onClick={() => setRows(rows.filter((_, j) => j !== i))}>删除</a> },
        ]} />
      <Space style={{ marginTop: 12 }}>
        <Button icon={<PlusOutlined />} onClick={() => setRows([...rows, {}])}>加一行</Button>
        <Button type="primary" onClick={save}>保存颜色</Button>
      </Space>
    </div>
  );
}

// 尺码 Tab：整组编辑后一次保存（顺序即穿着顺序）
function SizesTab({ 款号, sizes, onSaved }: { 款号: string; sizes: string[]; onSaved: () => void }) {
  const [text, setText] = useState(sizes.join(","));
  useEffect(() => setText(sizes.join(",")), [sizes]);
  const save = async () => {
    const arr = text.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    await stylesApi.saveSizes(款号, arr);
    message.success("尺码已保存"); onSaved();
  };
  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      <div>
        {sizes.map(s => <Tag key={s} color="geekblue" style={{ borderRadius: 6 }}>{s}</Tag>)}
      </div>
      <Input placeholder="用逗号分隔，如 S,M,L,XL（顺序即穿着顺序）"
        value={text} onChange={e => setText(e.target.value)} style={{ maxWidth: 420 }} />
      <Button type="primary" onClick={save}>保存尺码</Button>
    </Space>
  );
}

interface LinesField { name: string; label: string; price?: boolean; number?: boolean }

// 工序/BOM Tab：走泛型主数据 CRUD（resource: style-processes / style-bom-lines），按款号过滤
function LinesTab({ 款号, resource, fields, hidePriceCols, onSaved }: {
  款号: string; resource: string;
  fields: LinesField[];
  hidePriceCols: boolean; onSaved: () => void;
}) {
  const apiRes = masterApi(resource);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [form] = Form.useForm();
  const visible = fields.filter(f => !(f.price && hidePriceCols));

  const load = useCallback(async () => {
    // 泛型接口的 keyword 对所有字符串列模糊匹配,用款号过滤后再前端精确筛选
    const r = await apiRes.list(1, 200, 款号);
    setRows((r.items as Record<string, unknown>[]).filter(x => x.款号 === 款号));
  }, [款号, resource]);
  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    const v = await form.validateFields();
    const body = { ...v, 款号 };
    if (editing && editing.id) await apiRes.update(editing.id as number, body);
    else await apiRes.create(body);
    message.success("已保存"); setEditing(null); form.resetFields(); load(); onSaved();
  };

  return (
    <div>
      <Table size="small" rowKey="id" pagination={false} dataSource={rows}
        columns={[
          ...visible.map(f => ({ title: f.label, dataIndex: f.name, key: f.name })),
          {
            title: "操作", key: "_op", width: 120,
            render: (_: unknown, row: Record<string, unknown>) => (
              <Space>
                <a onClick={() => { setEditing(row); form.setFieldsValue(row); }}>编辑</a>
                <Popconfirm title="确认删除?" onConfirm={async () => { await apiRes.remove(row.id as number); load(); onSaved(); }}>
                  <a>删除</a>
                </Popconfirm>
              </Space>
            ),
          },
        ]} />
      <Button icon={<PlusOutlined />} style={{ marginTop: 12 }}
        onClick={() => { setEditing({ id: 0 }); form.resetFields(); }}>新增</Button>
      <Modal open={!!editing} title={editing?.id ? "编辑" : "新增"} destroyOnHidden
        onOk={onSave} onCancel={() => { setEditing(null); form.resetFields(); }}>
        <Form form={form} layout="vertical">
          {visible.map(f => (
            <Form.Item key={f.name} name={f.name} label={f.label}>
              {f.number ? <InputNumber style={{ width: "100%" }} /> : <Input />}
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </div>
  );
}

export default function StyleDetailPage() {
  const { styleNo } = useParams();
  const 款号 = styleNo ? decodeURIComponent(styleNo) : "";
  const perms = usePerms();
  const nav = useNavigate();
  const [full, setFull] = useState<StyleFull | null>(null);
  const priceHidden = hidePrice(perms, MENU);

  const load = useCallback(async () => {
    if (款号) setFull(await stylesApi.full(款号));
  }, [款号]);
  useEffect(() => { load(); }, [load]);

  if (!full) return <Card variant="borderless" loading title={`款式 ${款号}`} />;

  return (
    <Card
      variant="borderless"
      title={
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => nav(-1)} />
          <span>款式 {款号}</span>
          <Tag color="blue" style={{ borderRadius: 6 }}>{String(full.主档.款式 ?? "")}</Tag>
        </Space>
      }
    >
      {!priceHidden && (
        <Descriptions size="small" column={4} style={{ marginBottom: 16 }}
          items={[
            { key: "1", label: "单价", children: String(full.主档.单价 ?? "-") },
            { key: "2", label: "成本价", children: String(full.主档.成本价 ?? "-") },
            { key: "3", label: "批发价", children: String(full.主档.批发价 ?? "-") },
            { key: "4", label: "零售价", children: String(full.主档.零售价 ?? "-") },
          ]} />
      )}
      <Tabs
        items={[
          { key: "colors", label: `颜色 (${full.颜色.length})`,
            children: <ColorsTab 款号={款号} colors={full.颜色} onSaved={load} /> },
          { key: "sizes", label: `尺码 (${full.尺码.length})`,
            children: <SizesTab 款号={款号} sizes={full.尺码} onSaved={load} /> },
          { key: "processes", label: `工序工价 (${full.工序.length})`,
            children: <LinesTab 款号={款号} resource="style-processes" hidePriceCols={priceHidden} onSaved={load}
              fields={[
                { name: "工序号", label: "工序号" }, { name: "工序名称", label: "工序名称" },
                { name: "单价", label: "工价", price: true, number: true }, { name: "工序类型", label: "工序类型" },
              ]} /> },
          { key: "bom", label: `物料BOM (${full.物料.length})`,
            children: <LinesTab 款号={款号} resource="style-bom-lines" hidePriceCols={priceHidden} onSaved={load}
              fields={[
                { name: "物料编号", label: "物料编号" }, { name: "物料名称", label: "物料名称" },
                { name: "规格", label: "规格" }, { name: "颜色", label: "颜色" },
                { name: "单位", label: "单位" }, { name: "使用数量", label: "单件用量", number: true },
              ]} /> },
        ]} />
    </Card>
  );
}
