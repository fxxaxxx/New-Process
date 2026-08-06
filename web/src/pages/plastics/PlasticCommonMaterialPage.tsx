import { useCallback, useEffect, useState } from "react";
import {
  Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Table, message,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { plasticCommonMaterialApi, type PlasticCommonMaterialRow } from "../../api/plasticCommonMaterial";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PlasticMaterialPicker from "./PlasticMaterialPicker";
import PlasticMoldPicker from "./PlasticMoldPicker";
import type { PlasticMoldRow } from "../../api/plasticMold";
import { 二次加工类别后缀, 二次加工字母 } from "../../utils/secondProcess";

const MENU = "塑胶共用物料表";
const ALL_APPROVAL = "全部";
const crud = masterApi("plastic-common-materials");
const 套数规则提示 = "套数必须等于 出模数 ÷ 用量";
// 无单价权限时跳过带回的价格字段
const 价格字段 = new Set(["啤机价钱", "胶件啤工价", "胶料单价", "原胶料单价"]);

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
  const [selRow, setSelRow] = useState<PlasticCommonMaterialRow | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [moldPickerOpen, setMoldPickerOpen] = useState(false);

  // 二次加工类别推导提示(旧说明书:BD=电镀+印喷,AF=印喷+植绒,AH=印喷+植发)
  const 加工内容V = Form.useWatch("加工内容", form) as string | undefined;
  const 二次V = Form.useWatch("二次加工内容", form) as string | undefined;
  const 类别后缀 = 二次加工类别后缀(加工内容V, 二次V);
  const 类别提示 = 类别后缀
    ? `${类别后缀} 类(第一次 ${加工内容V ?? ""}=${二次加工字母(类别后缀, 加工内容V) ?? "?"},第二次 ${二次V ?? ""}=${二次加工字母(类别后缀, 二次V) ?? "?"})`
    : "";

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
      setSelRow(null);
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
      message.success("已保存"); setEditing(null); setSelRow(null); await loadRows(page);
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    }
    finally { setSaving(false); }
  };

  // 工模联动:选中工模后带回对应字段(工模编号必带;价格字段在无单价权限时跳过)
  const applyMold = (m: PlasticMoldRow) => {
    const patch: Record<string, unknown> = { 工模编号: m.工模编号 };
    const pairs: [string, unknown][] = [
      ["颜色", m.颜色], ["色粉号", m.色粉号], ["用料名称", m.用料名称],
      ["整啤模腔数", m.整啤模腔数], ["水口比例", m.水口比例], ["模具日产量", m.模具日产量],
      ["整啤毛重", m.整啤毛重], ["整啤净重", m.整啤净重], ["啤机机型", m.啤机机型],
      ["啤机价钱", m.啤机价钱], ["胶件啤工价", m.胶件啤工价], ["胶料单价", m.胶料单价], ["原胶料单价", m.原胶料单价],
    ];
    for (const [k, val] of pairs) {
      if (val == null || val === "") continue;
      if (priceHidden && 价格字段.has(k)) continue;
      patch[k] = val;
    }
    form.setFieldsValue(patch);
    void form.validateFields(["套数"]).catch(() => {});
    message.success("已从工模表带回字段");
  };

  const del = async (r: PlasticCommonMaterialRow) => {
    try { await crud.remove(r.ID); message.success("已删除"); setSelRow(null); await loadRows(page); }
    catch { message.error("删除失败"); }
  };

  const columns = [
    { title: "客户", dataIndex: "客户", width: 90 },
    { title: "塑胶货号", dataIndex: "塑胶货号", width: 110 },
    { title: "工模编号", dataIndex: "工模编号", width: 90 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "色粉号", dataIndex: "色粉号", width: 90 },
    { title: "用料名称", dataIndex: "用料名称", width: 110 },
    { title: "加工内容", dataIndex: "加工内容", width: 110 },
    { title: "加工单价", dataIndex: "加工单价", width: 90, align: "right" as const, render: money },
    { title: "整啤净重", dataIndex: "整啤净重", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "原胶件单净重", dataIndex: "原胶件单净重", width: 110, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "整啤模腔数", dataIndex: "整啤模腔数", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "套数", dataIndex: "套数", width: 70, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "用量", dataIndex: "用量", width: 80, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "出模数", dataIndex: "出模数", width: 80, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "水口比例", dataIndex: "水口比例", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "整啤毛重", dataIndex: "整啤毛重", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "模具日产量", dataIndex: "模具日产量", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "啤机机型", dataIndex: "啤机机型", width: 90 },
    { title: "啤机价钱", dataIndex: "啤机价钱", width: 90, align: "right" as const, render: money },
    { title: "胶件啤工价", dataIndex: "胶件啤工价", width: 100, align: "right" as const, render: money },
    { title: "胶料单价", dataIndex: "胶料单价", width: 90, align: "right" as const, render: money },
    { title: "原胶料单价", dataIndex: "原胶料单价", width: 100, align: "right" as const, render: money },
    { title: "加工总单价", dataIndex: "加工总单价", width: 100, align: "right" as const, render: money },
    { title: "其它成本", dataIndex: "其它成本", width: 90, align: "right" as const, render: money },
    { title: "二次加工内容", dataIndex: "二次加工内容", width: 120 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "共用原料编号", dataIndex: "共用原料编号", width: 110 },
    { title: "审核", dataIndex: "调整审核", width: 70, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
    { title: "备注内容", dataIndex: "备注内容", width: 140 },
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
        {canSave && <Button disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>}
        {canDelete && (
          <Popconfirm title={`确认删除该行${selRow ? ` [${selRow.物料编号}]` : ""}?`} onConfirm={() => selRow && del(selRow)}>
            <Button danger disabled={!selRow}>删除</Button>
          </Popconfirm>
        )}
        <span style={{ color: selRow ? "#1677ff" : "#999", fontSize: 12 }}>
          {selRow ? `已选中:${selRow.物料编号}` : "双击行选中后可编辑/删除"}
        </span>
      </Space>
      <Table
        size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns}
        onRow={(r: PlasticCommonMaterialRow) => ({
          onDoubleClick: () => setSelRow(r),
          style: { cursor: "pointer", ...(selRow?.ID === r.ID ? { background: "#e6f4ff" } : {}) },
        })}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
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
          <Form.Item name="工模编号" label="工模编号(双击或点选模,从工模表带回)">
            <Input readOnly onDoubleClick={() => setMoldPickerOpen(true)}
              addonAfter={<a onClick={() => setMoldPickerOpen(true)}>选模</a>} />
          </Form.Item>
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
          <Form.Item name="出模数" label="出模数"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="用量" label="用量"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="套数" label="套数(须等于 出模数 ÷ 用量)" dependencies={["出模数", "用量"]}
            rules={[{
              validator: (_, v) => {
                if (v == null) return Promise.resolve();
                const m = form.getFieldValue("出模数") as number | null | undefined;
                const u = form.getFieldValue("用量") as number | null | undefined;
                if (m == null || u == null) return Promise.resolve();
                if (u === 0) return Promise.reject(new Error(套数规则提示));
                const expected = Math.round((m / u) * 10000) / 10000;
                return Math.abs(v - expected) < 1e-9
                  ? Promise.resolve() : Promise.reject(new Error(套数规则提示));
              },
            }]}>
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="水口比例" label="水口比例"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="整啤毛重" label="整啤毛重"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="模具日产量" label="模具日产量"><InputNumber style={{ width: "100%" }} /></Form.Item>
          <Form.Item name="啤机机型" label="啤机机型"><Input /></Form.Item>
          {!priceHidden && (
            <Form.Item name="啤机价钱" label="啤机价钱"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          {!priceHidden && (
            <Form.Item name="胶件啤工价" label="胶件啤工价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          {!priceHidden && (
            <Form.Item name="胶料单价" label="胶料单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          {!priceHidden && (
            <Form.Item name="原胶料单价" label="原胶料单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          {!priceHidden && (
            <Form.Item name="加工总单价" label="加工总单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          {!priceHidden && (
            <Form.Item name="其它成本" label="其它成本"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          )}
          <Form.Item name="二次加工内容" label="二次加工内容"><Input /></Form.Item>
          <Form.Item label="二次加工类别(按 加工内容+二次加工内容 推导)">
            <Input value={类别提示} readOnly placeholder="非二次加工组合" />
          </Form.Item>
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
      <PlasticMoldPicker
        open={moldPickerOpen} onClose={() => setMoldPickerOpen(false)}
        onPick={applyMold}
      />
    </Card>
  );
}
