import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AutoComplete, Button, Card, Form, Input, InputNumber, Modal, Popconfirm, Space, Table, Tree, message,
} from "antd";
import type { TreeDataNode } from "antd";
import { PlusOutlined, EditOutlined, DeleteOutlined, UploadOutlined, BarcodeOutlined } from "@ant-design/icons";
import { materialMasterApi, type MaterialRow, type MaterialCategoryNode } from "../../api/materialMaster";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { toDocCurrency, useFeatureSettings } from "../../auth/featureSettings";
import MaterialImportModal from "../../components/MaterialImportModal";
import BarcodePrintModal from "../../components/scan/BarcodePrintModal";
import { MATERIAL_IMPORT_SPEC } from "../../utils/materialImport";

const MENU = "物料资料";
const CAT_MENU = "物料类别";
const ALL = "__ALL__";
const materials = masterApi("materials");
const materialCategories = masterApi("material-categories");
const warehouseLocations = masterApi("warehouse-locations");

// 左树节点（由扁平 MaterialCategoryNode 按 父级 组装；数据结构支持多层，UI 两层够用）
interface CatInfo {
  key: string;
  name: string;          // = 物料资料.物料类别 过滤值
  code?: string;         // 主数据编号（物料行自带类别无）
  parent: string | null; // 父节点 key
  count: number;
  hasChildren: boolean;
}

export default function MaterialMasterPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const canCatSave = can(perms, CAT_MENU, "保存");
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));
  const featureSettings = useFeatureSettings();

  const [cats, setCats] = useState<MaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<MaterialRow | null>(null); // null=不显示；ID=0 表示新增
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  // 双击行选中,工具栏"编辑/删除"作用于选中行
  const [selRow, setSelRow] = useState<MaterialRow | null>(null);

  const [catParent, setCatParent] = useState<string | null | undefined>(undefined); // undefined=不显示；null=顶级
  const [catName, setCatName] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);   // 条码打印弹窗
  // 仓库位置字典(数据源:仓库位置表);可输入可选择,不强制字典值(兼容存量自由文本)
  const [locOptions, setLocOptions] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    warehouseLocations.list(1, 200)
      .then(r => setLocOptions(r.items
        .filter(x => typeof x.编号 === "string" && x.编号)
        .map(x => ({ value: x.编号 as string, label: `${x.编号}${x.名称 ? ` ${x.名称}` : ""}` }))))
      .catch(() => setLocOptions([])); // 无字典权限等:仍可按自由文本录入
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
      treeData: [{ title: "全部物料", key: ALL, children: roots.map(toNode) }] as TreeDataNode[],
      infoByKey: infos,
    };
  }, [cats]);

  const sel = selKey === ALL ? undefined : infoByKey.get(selKey);
  const 类别 = sel?.name;
  const 含子级 = sel?.hasChildren ?? false;

  const loadCats = useCallback(async () => {
    try { setCats(await materialMasterApi.categories()); } catch { /* 忽略 */ }
  }, []);

  const loadRows = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await materialMasterApi.list(类别, keyword.trim() || undefined, p, 50, undefined, 含子级);
      setRows(r.items); setTotal(r.total); setSelRow(null);
    } catch { message.error("加载物料失败"); }
    finally { setLoading(false); }
  }, [canOpen, 类别, keyword, 含子级]);

  useEffect(() => { if (canOpen) loadCats(); }, [canOpen, loadCats]);
  // 选中分类变化时重查(回到第1页)；关键字由搜索框显式触发，故 loadRows 不入依赖
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); loadRows(1); }, [canOpen, selKey, 含子级]);

  const openCreate = async () => {
    const init: MaterialRow = { ID: 0, 物料类别: 类别 };
    setEditing(init);
    form.resetFields();
    // 功能设置消费: 新增物料的货币默认取 系统.默认货币(HKD→HK$ 写法对齐单据沿用习惯)
    form.setFieldsValue({ ...init, 货币: toDocCurrency(featureSettings.默认货币) });
    try { form.setFieldsValue({ 物料编号: await materialMasterApi.nextCode(类别) }); }
    catch { /* 预填失败可手输；留空保存时后端兜底生成 */ }
  };
  const openEdit = async (r: MaterialRow) => {
    try {
      const full = await materials.get(r.ID) as Record<string, unknown>;
      setEditing(r);
      form.resetFields();
      form.setFieldsValue(full);
    } catch { message.error("加载物料详情失败"); }
  };

  const submit = async () => {
    const v = await form.validateFields();
    setSaving(true);
    try {
      if (editing && editing.ID > 0) await materials.update(editing.ID, v);
      else await materialMasterApi.create(v); // 编号留空由后端自动生成
      message.success("已保存");
      setEditing(null);
      await loadCats();
      await loadRows(page);
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "保存失败");
    }
    finally { setSaving(false); }
  };

  const del = async (r: MaterialRow) => {
    try {
      await materials.remove(r.ID);
      message.success("已删除");
      await loadCats();
      await loadRows(page);
    } catch { message.error("删除失败"); }
  };

  // 新增同级类别：与当前选中类别同一父级；新增子类别：挂到当前选中类别下（全部物料=顶级）
  const openSiblingCat = () => { setCatName(""); setCatParent(sel?.parent ?? null); };
  const openChildCat = () => { setCatName(""); setCatParent(sel ? (sel.code ?? sel.name) : null); };

  const submitCat = async () => {
    const name = catName.trim();
    if (!name) return;
    setCatSaving(true);
    try {
      // 编号 与 名称 同值：父级引用（类别列）指向父类别编号，物料资料.物料类别 用名称过滤
      await materialCategories.create({ 编号: name, 名称: name, 类别: catParent ?? undefined });
      message.success("类别已保存");
      setCatParent(undefined);
      await loadCats();
    } catch { message.error("类别保存失败"); }
    finally { setCatSaving(false); }
  };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "类别", dataIndex: "物料类别", width: 100 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "单价", dataIndex: "单价", width: 90, align: "right" as const, render: money },
    { title: "销售价", dataIndex: "销售价", width: 90, align: "right" as const, render: money },
    { title: "库存", dataIndex: "库存", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "最低库存", dataIndex: "最低库存", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "供应商", dataIndex: "供应商名称", width: 140 },
    { title: "备注", dataIndex: "备注", width: 160 },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"物料资料·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="物料资料" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      <div style={{ width: 240, flex: "0 0 240px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        {canCatSave && (
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
          <Button icon={<BarcodeOutlined />} onClick={() => setPrintOpen(true)}>打印条码</Button>
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
        title={editing && editing.ID > 0 ? "编辑物料" : "新增物料"}
        open={!!editing} onCancel={() => setEditing(null)} onOk={submit}
        confirmLoading={saving} destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="物料编号" label="物料编号（留空则保存时自动生成）">
            <Input placeholder="自动生成，可修改" />
          </Form.Item>
          <Form.Item name="物料名称" label="物料名称"><Input /></Form.Item>
          <Form.Item name="物料类别" label="类别"><Input /></Form.Item>
          <Form.Item name="规格" label="规格"><Input /></Form.Item>
          <Form.Item name="颜色" label="颜色"><Input /></Form.Item>
          <Form.Item name="单位" label="单位"><Input /></Form.Item>
          <Form.Item name="仓库位置" label="仓库位置（可从字典选择，也可自由输入）">
            <AutoComplete
              allowClear options={locOptions}
              filterOption={(input, opt) =>
                (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          {!priceHidden && (
            <>
              <Form.Item name="单价" label="单价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
              <Form.Item name="销售价" label="销售价"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
            </>
          )}
          <Form.Item name="供应商编号" label="供应商编号"><Input /></Form.Item>
          <Form.Item name="备注" label="备注"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="款号" hidden><Input /></Form.Item>
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

      <MaterialImportModal
        open={importOpen} title="导入物料表格" spec={MATERIAL_IMPORT_SPEC}
        onImport={rows => materialMasterApi.importRows(rows)}
        onClose={() => setImportOpen(false)}
        onDone={() => { void loadCats(); void loadRows(1); setPage(1); }}
      />
      <BarcodePrintModal open={printOpen} onClose={() => setPrintOpen(false)} />
    </Card>
  );
}
