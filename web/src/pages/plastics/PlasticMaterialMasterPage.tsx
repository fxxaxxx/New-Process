import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button, Card, Col, Divider, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Table, Tree, message,
} from "antd";
import type { TreeDataNode } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined } from "@ant-design/icons";
import { plasticMaterialMasterApi, type PlasticMaterialRow, type PlasticMaterialCategoryNode } from "../../api/plasticMaterialMaster";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { toDocCurrency, useFeatureSettings } from "../../auth/featureSettings";
import type { PlasticMoldRow } from "../../api/plasticMold";
import PlasticMoldPicker from "./PlasticMoldPicker";
import MaterialImportModal from "../../components/MaterialImportModal";
import { PLASTIC_IMPORT_SPEC } from "../../utils/materialImport";

const MENU = "塑胶物料资料";
const ALL = "__ALL__";
const plasticMaterials = masterApi("plastic-materials");
const plasticMaterialCategories = masterApi("plastic-material-categories");

// 说明书 2-2:工模带出的字段(原料单价 ← 工模.胶料单价)
const moldFieldsOf = (m: PlasticMoldRow) => ({
  工模编号: m.工模编号,
  颜色: m.颜色, 色粉号: m.色粉号, 用料名称: m.用料名称, 啤机机型: m.啤机机型,
  整啤模腔数: m.整啤模腔数 ?? null, 水口比例: m.水口比例 ?? null, 模具日产量: m.模具日产量 ?? null,
  整啤毛重: m.整啤毛重 ?? null, 整啤净重: m.整啤净重 ?? null,
  啤机价钱: m.啤机价钱 ?? null, 胶件啤工价: m.胶件啤工价 ?? null,
  原料单价: m.胶料单价 ?? null, 原胶料单价: m.原胶料单价 ?? null,
});

const numField = (name: string, label: string) => (
  <Col span={8} key={name}>
    <Form.Item name={name} label={label}><InputNumber style={{ width: "100%" }} /></Form.Item>
  </Col>
);
const textField = (name: string, label: string, required = false) => (
  <Col span={8} key={name}>
    <Form.Item name={name} label={label} rules={required ? [{ required: true, message: `请输入${label}` }] : undefined}>
      <Input />
    </Form.Item>
  </Col>
);

// 左树节点（由扁平 PlasticMaterialCategoryNode 按 父级 组装；数据结构支持多层，UI 两层够用）
interface CatInfo {
  key: string;
  name: string;          // = 塑胶物料资料.物料类别 过滤值
  code?: string;         // 主数据编号（物料行自带类别无）
  parent: string | null; // 父节点 key
  count: number;
  hasChildren: boolean;
}

export default function PlasticMaterialMasterPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));
  const featureSettings = useFeatureSettings();

  const [cats, setCats] = useState<PlasticMaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<PlasticMaterialRow | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  // 双击行选中,工具栏"编辑/删除"作用于选中行
  const [selRow, setSelRow] = useState<PlasticMaterialRow | null>(null);

  const [catParent, setCatParent] = useState<string | null | undefined>(undefined); // undefined=不显示；null=顶级
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);

  const loadCats = useCallback(async () => {
    try { setCats(await plasticMaterialMasterApi.categories()); } catch { /* 忽略 */ }
  }, []);

  // 扁平节点 → key/父子 映射（key：主数据编号，物料自带类别用 ~名称）
  const { treeData, infoByKey } = useMemo(() => {
    const infos = new Map<string, CatInfo>();
    for (const c of cats) {
      const name = c.类别 ?? "";
      const key = c.编号 ?? `~${name}`;
      if (!name || infos.has(key)) continue;
      infos.set(key, { key, name, code: c.编号 ?? undefined, parent: null, count: c.数量, hasChildren: false });
    }
    const childrenOf = new Map<string, CatInfo[]>();
    const roots: CatInfo[] = [];
    for (const c of cats) {
      const key = c.编号 ?? `~${c.类别 ?? ""}`;
      const info = infos.get(key);
      if (!info) continue;
      const parentKey = c.父级 && infos.has(c.父级) ? c.父级 : null;
      info.parent = parentKey;
      if (parentKey) {
        const arr = childrenOf.get(parentKey) ?? [];
        arr.push(info);
        childrenOf.set(parentKey, arr);
        infos.get(parentKey)!.hasChildren = true;
      } else {
        roots.push(info);
      }
    }
    const toNode = (info: CatInfo): TreeDataNode => ({
      title: `${info.name}（${info.count}）`,
      key: info.key,
      children: (childrenOf.get(info.key) ?? []).map(toNode),
    });
    return {
      treeData: [{ title: "全部塑胶物料", key: ALL, children: roots.map(toNode) }] as TreeDataNode[],
      infoByKey: infos,
    };
  }, [cats]);

  const sel = selKey === ALL ? undefined : infoByKey.get(selKey);
  const 类别 = sel?.name;
  const 含子级 = sel?.hasChildren ?? false;

  const loadRows = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await plasticMaterialMasterApi.list(类别, keyword.trim() || undefined, p, 50, undefined, 含子级);
      setRows(r.items); setTotal(r.total); setSelRow(null);
    } catch { message.error("加载塑胶物料失败"); }
    finally { setLoading(false); }
  }, [canOpen, 类别, keyword, 含子级]);

  useEffect(() => { if (canOpen) loadCats(); }, [canOpen, loadCats]);
  // 选中分类变化时重查(回到第1页)；关键字由搜索框显式触发，故 loadRows 不入依赖
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); loadRows(1); }, [canOpen, selKey, 含子级]);

  // 新增同级类别：与当前选中类别同一父级；新增子类别：挂到当前选中类别下（全部塑胶物料=顶级）
  const openSiblingCat = () => { setCatName(""); setCatParent(sel?.parent ?? null); };
  const openChildCat = () => { setCatName(""); setCatParent(sel ? (sel.code ?? sel.name) : null); };

  const submitCat = async () => {
    const name = catName.trim();
    if (!name) return;
    setCatSaving(true);
    try {
      // 编号 与 名称 同值：父级引用（类别列）指向父类别编号，塑胶物料资料.物料类别 用名称过滤
      await plasticMaterialCategories.create({ 编号: name, 名称: name, 类别: catParent ?? undefined });
      message.success("类别已保存");
      setCatParent(undefined);
      await loadCats();
    } catch { message.error("类别保存失败"); }
    finally { setCatSaving(false); }
  };

  // 新增:先弹工模选择器;编辑中的"重选工模"只覆盖工模字段,手动字段保留
  const openCreate = () => setPickerOpen(true);
  const onMoldPicked = (m: PlasticMoldRow) => {
    const moldFields = moldFieldsOf(m);
    if (editing) {
      form.setFieldsValue(moldFields);
      return;
    }
    const init: PlasticMaterialRow = {
      ID: 0, 物料类别: 类别, 单位: "PCS",
      ...moldFields,
    };
    setEditing(init);
    form.resetFields();
    form.setFieldsValue({ ...init, 货币: toDocCurrency(featureSettings.默认货币) });
  };
  const openEdit = async (r: PlasticMaterialRow) => {
    try {
      const full = await plasticMaterials.get(r.ID) as Record<string, unknown>;
      setEditing(r);
      form.resetFields();
      form.setFieldsValue(full);
    } catch { message.error("加载塑胶物料详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await plasticMaterials.update(editing.ID, v);
      else await plasticMaterials.create(v);
      message.success("已保存");
      setEditing(null);
      await loadCats();
      await loadRows(page);
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    }
    finally { setSaving(false); }
  };

  const del = async (r: PlasticMaterialRow) => {
    try {
      await plasticMaterials.remove(r.ID);
      message.success("已删除");
      await loadCats();
      await loadRows(page);
    } catch { message.error("删除失败"); }
  };

  const num = (v?: number | null) => v ?? "";
  // 旧系统固定表头(28 列,顺序不可变):塑胶货号=款号,原胶件单价=单价(导入时存的就是 单价 列)
  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 100 },
    { title: "客户", dataIndex: "客户", width: 80 },
    { title: "塑胶货号", dataIndex: "款号", width: 90 },
    { title: "工模编号", dataIndex: "工模编号", width: 150 },
    { title: "物料名称", dataIndex: "物料名称", width: 170 },
    { title: "颜色", dataIndex: "颜色", width: 100 },
    { title: "色粉号", dataIndex: "色粉号", width: 80 },
    { title: "原料名称", dataIndex: "原料名称", width: 130 },
    { title: "用料名称", dataIndex: "用料名称", width: 200 },
    { title: "加工内容", dataIndex: "加工内容", width: 100 },
    { title: "加工总单价(HKD)", dataIndex: "加工总单价", width: 120, align: "right" as const, render: money },
    { title: "二次加工", dataIndex: "二次加工", width: 90 },
    { title: "二次加工价", dataIndex: "二次加工价", width: 95, align: "right" as const, render: money },
    { title: "整啤净重", dataIndex: "整啤净重", width: 90, align: "right" as const, render: num },
    { title: "原胶件单净重", dataIndex: "原胶件单净重", width: 110, align: "right" as const, render: num },
    { title: "整啤模腔数", dataIndex: "整啤模腔数", width: 100, align: "right" as const, render: num },
    { title: "套数", dataIndex: "套数", width: 70, align: "right" as const, render: num },
    { title: "出模数", dataIndex: "出模数", width: 80, align: "right" as const, render: num },
    { title: "用量", dataIndex: "用量", width: 70, align: "right" as const, render: num },
    { title: "啤机机型", dataIndex: "啤机机型", width: 90 },
    { title: "模具日产量", dataIndex: "模具日产量", width: 95, align: "right" as const, render: num },
    { title: "啤机价钱", dataIndex: "啤机价钱", width: 90, align: "right" as const, render: money },
    { title: "胶件啤工价", dataIndex: "胶件啤工价", width: 100, align: "right" as const, render: money },
    { title: "原料单价", dataIndex: "原料单价", width: 90, align: "right" as const, render: money },
    { title: "胶件料价", dataIndex: "胶件料价", width: 90, align: "right" as const, render: money },
    { title: "原胶件单价", dataIndex: "单价", width: 95, align: "right" as const, render: money },
    { title: "备注", dataIndex: "备注", width: 140 },
    { title: "其他成本", dataIndex: "其他成本", width: 90, align: "right" as const, render: money },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶物料资料·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="塑胶物料资料" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      <div style={{ width: 240, flex: "0 0 240px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        {canSave && (
          <Space size={4} style={{ marginBottom: 4 }} wrap>
            <Button size="small" disabled={!sel} onClick={openSiblingCat}>新增同级类别</Button>
            <Button size="small" onClick={openChildCat}>新增子类别</Button>
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Input.Search
            placeholder="物料编号/名称/规格/颜色/供应商" allowClear style={{ width: 260 }}
            value={keyword} onChange={e => setKeyword(e.target.value)}
            onSearch={() => { setPage(1); loadRows(1); }}
          />
          {canSave && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新增</Button>}
          {canSave && <Button icon={<UploadOutlined />} onClick={() => setImportOpen(true)}>导入表格</Button>}
          {canSave && (
            <Button icon={<EditOutlined />} disabled={!selRow} onClick={() => selRow && openEdit(selRow)}>编辑</Button>
          )}
          {canDelete && (
            <Popconfirm title={`确认删除${selRow ? ` ${selRow.物料编号} ${selRow.物料名称 ?? ""}` : ""}?`} onConfirm={() => selRow && del(selRow)}>
              <Button danger icon={<DeleteOutlined />} disabled={!selRow}>删除</Button>
            </Popconfirm>
          )}
          {!selRow && <span style={{ color: "#999", fontSize: 12 }}>双击行选中后可编辑/删除</span>}
          {selRow && <span style={{ color: "#1677ff", fontSize: 12 }}>已选中：{selRow.物料编号} {selRow.物料名称}</span>}
        </Space>
        <Table
          size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns}
          scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
          onRow={r => ({
            onDoubleClick: () => setSelRow(r),
            style: selRow?.ID === r.ID ? { background: "#e6f4ff", cursor: "pointer" } : { cursor: "pointer" },
          })}
          pagination={{
            current: page, pageSize: 50, total, showSizeChanger: false,
            onChange: p => { setPage(p); loadRows(p); }, showTotal: t => `共 ${t} 条`,
          }}
        />
      </div>

      <Modal
        title={editing && editing.ID > 0 ? "编辑塑胶物料" : "新增塑胶物料"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose width={780}
      >
        <Form form={form} layout="vertical">
          <Divider titlePlacement="start" plain>基本资料</Divider>
          <Row gutter={12}>
            {textField("物料编号", "物料编号", true)}
            {textField("款号", "塑胶货号")}
            {textField("物料名称", "物料名称")}
            {textField("客户", "客户")}
            {textField("物料类别", "类别")}
            {textField("规格", "规格")}
            {textField("加工内容", "加工内容")}
            {textField("二次加工", "二次加工")}
            {textField("原料名称", "原料名称")}
            {textField("单位", "单位")}
            {textField("仓位号", "仓位号")}
            {textField("供应商编号", "供应商编号")}
          </Row>

          <Divider titlePlacement="start" plain>工模资料</Divider>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="工模编号">
                <Space.Compact style={{ width: "100%" }}>
                  <Form.Item name="工模编号" noStyle>
                    <Input readOnly placeholder="点右侧按钮选择工模" />
                  </Form.Item>
                  <Button onClick={() => setPickerOpen(true)}>重选工模</Button>
                </Space.Compact>
              </Form.Item>
            </Col>
            {textField("颜色", "颜色")}
            {textField("色粉号", "色粉号")}
            {textField("用料名称", "用料名称")}
            {textField("啤机机型", "啤机机型")}
            {numField("整啤模腔数", "整啤模腔数")}
            {numField("水口比例", "水口比例")}
            {numField("模具日产量", "模具日产量")}
          </Row>

          <Divider titlePlacement="start" plain>重量与用量</Divider>
          <Row gutter={12}>
            {numField("整啤毛重", "整啤毛重")}
            {numField("整啤净重", "整啤净重")}
            {numField("原胶件单净重", "原胶件单净重")}
            {numField("出模数", "出模数")}
            {numField("用量", "用量")}
            {numField("套数", "套数")}
          </Row>

          {!priceHidden && (
            <>
              <Divider titlePlacement="start" plain>价格</Divider>
              <Row gutter={12}>
                {numField("单价", "单价")}
                {numField("销售价", "销售价")}
                {numField("啤机价钱", "啤机价钱")}
                {numField("胶件啤工价", "胶件啤工价")}
                {numField("原料单价", "原料单价")}
                {numField("胶件料价", "胶件料价")}
                {numField("原胶料单价", "原胶料单价")}
                {numField("二次加工价", "二次加工价")}
                {numField("加工总单价", "加工总单价")}
                {numField("其他成本", "其他成本")}
              </Row>
            </>
          )}

          <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="货币" hidden><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal
        title={catParent ? `新增子类别（上级：${catParent}）` : "新增类别（顶级）"}
        open={catParent !== undefined} onCancel={() => setCatParent(undefined)} onOk={submitCat}
        confirmLoading={catSaving} destroyOnClose okButtonProps={{ disabled: !catName.trim() }}
      >
        <Input
          placeholder="类别名称" value={catName} maxLength={20}
          onChange={e => setCatName(e.target.value)} onPressEnter={submitCat}
        />
      </Modal>

      <PlasticMoldPicker open={pickerOpen} onPick={onMoldPicked} onClose={() => setPickerOpen(false)} />

      <MaterialImportModal
        open={importOpen} title="导入塑胶物料表格" spec={PLASTIC_IMPORT_SPEC}
        onImport={rows => plasticMaterialMasterApi.importRows(rows)}
        onClose={() => setImportOpen(false)}
        onDone={() => { void loadCats(); void loadRows(1); setPage(1); }}
      />
    </Card>
  );
}
