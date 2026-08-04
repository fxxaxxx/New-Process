import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { masterApi } from "../../api/master";
import { api } from "../../api/client";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "工模表";
const crud = masterApi("plastic-molds");
const machineRates = masterApi("injection-machine-rates");

// 工模编号改名同步:引用方(塑胶物料资料/塑胶共用物料表)跟着改
const syncCode = (旧编号: string, 新编号: string) =>
  api.post<{ 物料资料更新: number; 共用物料更新: number }>(
    "/master/plastic-molds/sync-code", { 旧编号, 新编号 }).then(r => r.data);

// 工模技术字段同步:塑胶物料资料同名字段(原料单价←胶料单价)跟着改
const syncFields = (工模编号: string) =>
  api.post<{ 物料资料更新: number }>(
    "/master/plastic-molds/sync-fields", { 工模编号 }).then(r => r.data);

// 参与"字段改动检测/同步"的工模字段(颜色/色粉号/备注/客户/工模名称/整啤套数 不同步)
const SYNC_FIELDS = ["用料名称", "整啤模腔数", "水口比例", "模具日产量", "整啤毛重", "整啤净重",
  "啤机机型", "啤机价钱", "胶件啤工价", "原胶料单价", "胶料单价"] as const;
const normVal = (x: unknown) => {
  if (x === null || x === undefined || x === "") return null;
  const n = Number(x);
  return Number.isFinite(n) && typeof x !== "string" ? n : String(x).trim();
};

type MoldRow = Record<string, unknown> & { ID: number };
type RateOption = { value: string; price: number | null };

export default function PlasticMoldPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const priceHidden = hidePrice(perms, MENU);
  const num = (v?: number | null) => v ?? "";

  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<MoldRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<MoldRow | null>(null);
  const [selRow, setSelRow] = useState<MoldRow | null>(null);
  const [origCode, setOrigCode] = useState(""); // 打开编辑表单时的原工模编号(改名同步判断用)
  const [origRow, setOrigRow] = useState<Record<string, unknown> | null>(null); // 打开时的整行(字段同步差异比较用)
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  // 啤机机型下拉(数据源:啤机机型啤工表);null=字典加载失败(无权限等),回落为手输框
  const [rateOptions, setRateOptions] = useState<RateOption[] | null>(null);

  useEffect(() => {
    machineRates.list(1, 200)
      .then(r => setRateOptions(r.items
        .filter(x => typeof x.啤机机型 === "string" && x.啤机机型)
        .map(x => ({ value: x.啤机机型 as string, price: (x.啤工价 as number | null) ?? null }))))
      .catch(() => setRateOptions(null));
  }, []);

  // 选中机型后:啤机价钱为空且有单价权限时才带出该机型啤工价(后端无单价权限已把啤工价脱敏为 null)
  const onRateSelect = (v?: string) => {
    if (priceHidden || v == null) return;
    const cur = form.getFieldValue("啤机价钱");
    if (cur !== undefined && cur !== null && cur !== "") return;
    const price = rateOptions?.find(o => o.value === v)?.price;
    if (price != null) form.setFieldValue("啤机价钱", price);
  };

  const loadRows = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await crud.list(p, 50, keyword.trim());
      // 后端按 camelCase 序列化为 id,这里归一化为 ID(编辑/删除/选中比较都按 ID;与其他自定义 api 一致)
      setRows((r.items as (MoldRow & { id?: number })[]).map(x => ({ ...x, ID: x.ID ?? x.id ?? 0 }))); setTotal(r.total);
      setSelRow(null);
    } catch { message.error("加载工模表失败"); }
    finally { setLoading(false); }
  }, [canOpen, keyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadRows(1); setPage(1); }, [canOpen]);

  const search = () => { setPage(1); loadRows(1); };

  const openCreate = () => {
    setEditing({ ID: 0 }); form.resetFields();
  };
  const openEdit = async (r: MoldRow) => {
    try {
      const full = await crud.get(r.ID) as Record<string, unknown>;
      setEditing(r); form.resetFields(); form.setFieldsValue(full);
      setOrigCode(String(full.工模编号 ?? ""));
      setOrigRow(full);
    } catch { message.error("加载详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await crud.update(editing.ID, v);
      else await crud.create(v);
      const newCode = String(v.工模编号 ?? "").trim().toUpperCase();
      const isEdit = !!(editing && editing.ID > 0);
      const renamed = isEdit && origCode && newCode && newCode !== origCode;
      // 技术字段差异(原料单价比较时用 胶料单价,故比较清单含 胶料单价 本身)
      const fieldsChanged = isEdit && !!origRow &&
        SYNC_FIELDS.some(f => normVal(origRow[f]) !== normVal(v[f]));
      setEditing(null); setSelRow(null); await loadRows(page);
      // 字段同步确认(改名流程走完后,用最终编号继续)
      const askFieldSync = () => {
        if (!fieldsChanged) return;
        Modal.confirm({
          title: "检测到工模资料有修改,是否把相同字段同步更新到【塑胶物料资料】吗?",
          okText: "是", cancelText: "否",
          onOk: async () => {
            try {
              const r = await syncFields(newCode);
              message.success(`已同步更新:物料资料 ${r.物料资料更新} 条`);
            } catch { message.error("同步更新失败"); }
          },
        });
      };
      if (renamed) {
        // 旧系统文案照搬:改名后询问是否同步引用方
        Modal.confirm({
          title: "检测到工模编号有修改,工模编号是否更新到【塑胶物料资料】【塑胶共用物料表】吗?",
          okText: "是", cancelText: "否",
          onOk: async () => {
            try {
              const r = await syncCode(origCode, newCode);
              message.success(`已同步更新:物料资料 ${r.物料资料更新} 条、共用物料 ${r.共用物料更新} 条`);
            } catch { message.error("同步更新失败"); }
            askFieldSync();
          },
          onCancel: () => askFieldSync(),
        });
      } else if (fieldsChanged) {
        askFieldSync();
      } else {
        message.success("已保存");
      }
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    }
    finally { setSaving(false); }
  };

  const del = async (r: MoldRow) => {
    try { await crud.remove(r.ID); message.success("已删除"); setSelRow(null); await loadRows(page); }
    catch { message.error("删除失败"); }
  };

  // 旧系统固定表头(11 列,顺序不可变);色粉号/整啤毛重/啤机价钱/胶件啤工价/胶料单价/原胶料单价 只在编辑表单
  const columns = [
    { title: "客户", dataIndex: "客户", width: 90 },
    { title: "工模编号", dataIndex: "工模编号", width: 140 },
    { title: "工模名称", dataIndex: "工模名称", width: 150 },
    { title: "整啤模腔数", dataIndex: "整啤模腔数", width: 100, align: "right" as const, render: num },
    { title: "整啤套数", dataIndex: "整啤套数", width: 90, align: "right" as const, render: num },
    { title: "啤机机型", dataIndex: "啤机机型", width: 90 },
    { title: "模具日产量", dataIndex: "模具日产量", width: 100, align: "right" as const, render: num },
    { title: "用料名称", dataIndex: "用料名称", width: 110 },
    { title: "整啤净重", dataIndex: "整啤净重", width: 90, align: "right" as const, render: num },
    { title: "水口比例", dataIndex: "水口比例", width: 90, align: "right" as const, render: num },
    { title: "备注", dataIndex: "备注", width: 140 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"工模表·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="工模表" variant="borderless">
      <Space style={{ marginBottom: 12 }} wrap>
        <Input.Search placeholder="工模编号/名称/颜色/用料" allowClear style={{ width: 260 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={search} />
        <Button type="primary" onClick={search}>查询</Button>
        {canSave && <Button icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
        {canSave && <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>}
        {canDelete && (
          <Popconfirm title={`确认删除该行${selRow ? ` [${selRow.工模编号}]` : ""}?`} onConfirm={() => selRow && del(selRow)}>
            <Button danger disabled={!selRow}>删除</Button>
          </Popconfirm>
        )}
        <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
          {selRow ? `已选中:${selRow.工模编号}` : "双击行选中后可编辑/删除"}
        </span>
      </Space>
      <Table
        size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns}
        onRow={(r: MoldRow) => ({
          onDoubleClick: () => setSelRow(r),
          style: { cursor: "pointer", ...(selRow?.ID === r.ID ? { background: "#e6f4ff" } : {}) },
        })}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ current: page, pageSize: 50, total, showSizeChanger: false,
          onChange: p => { setPage(p); loadRows(p); }, showTotal: t => `共 ${t} 条` }}
      />

      <Modal
        title={editing && editing.ID > 0 ? "编辑工模" : "新增工模"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="工模编号" label="工模编号(保存时自动转大写)"
            rules={[{ required: true, message: "请输入工模编号" }]}>
            <Input onChange={e => form.setFieldValue("工模编号", e.target.value.toUpperCase())} />
          </Form.Item>
          <Form.Item name="工模名称" label="工模名称"><Input /></Form.Item>
          <Form.Item name="客户" label="客户"><Input /></Form.Item>
          <Form.Item name="颜色" label="颜色(格式:颜色/PANTONE,如 绿色/7481C)"><Input /></Form.Item>
          <Form.Item name="色粉号" label="色粉号"><Input /></Form.Item>
          <Form.Item name="整啤模腔数" label="整啤模腔数"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="整啤套数" label="整啤套数"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="水口比例" label="水口比例"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="模具日产量" label="模具日产量"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="整啤毛重" label="整啤毛重"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="整啤净重" label="整啤净重"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="啤机机型" label="啤机机型">
            {rateOptions === null
              ? <Input />
              : <Select
                  showSearch allowClear placeholder="选择或输入机型关键字搜索"
                  options={rateOptions}
                  filterOption={(input, opt) =>
                    (opt?.value ?? "").toLowerCase().includes(input.toLowerCase())}
                  onChange={v => onRateSelect(v)}
                />}
          </Form.Item>
          {!priceHidden && (
            <Form.Item name="啤机价钱" label="啤机价钱"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          {!priceHidden && (
            <Form.Item name="胶件啤工价" label="胶件啤工价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          <Form.Item name="用料名称" label="用料名称"><Input /></Form.Item>
          {!priceHidden && (
            <Form.Item name="胶料单价" label="胶料单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          {!priceHidden && (
            <Form.Item name="原胶料单价" label="原胶料单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
