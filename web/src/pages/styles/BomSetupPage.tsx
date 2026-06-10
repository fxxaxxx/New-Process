import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm,
  Result, Row, Select, Space, Table, Tabs, message,
} from "antd";
import {
  CheckOutlined, CloseOutlined, DeleteOutlined, FileAddOutlined,
  FolderOpenOutlined, PlusOutlined, PrinterOutlined, SaveOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { stylesApi, type BomSave, type StyleListItem } from "../../api/styles";
import { masterApi } from "../../api/master";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "款号资料";

// 物料资料行（取自 GET /api/master/materials，物料资料·打开权限）
const materialsApi = masterApi("materials");
interface MaterialPick {
  物料编号?: string; 物料名称?: string; 规格?: string;
  物料类别?: string; 颜色?: string; 单位?: string;
}

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;
}

let rowSeq = 1;
const uid = () => rowSeq++;

// 物料明细编辑行。工模编号/备注 为 UI-only（原表无对应单据列，不持久）。
interface MatRow {
  key: number;
  物料编号: string;
  物料名称: string;
  工模编号: string; // UI-only
  规格: string;
  材料: string; // = 物料类别
  颜色: string;
  单位: string;
  用量?: number; // = 使用数量
  备注: string; // UI-only
}

const newRow = (): MatRow => ({
  key: uid(), 物料编号: "", 物料名称: "", 工模编号: "", 规格: "",
  材料: "", 颜色: "", 单位: "", 用量: undefined, 备注: "",
});

// 单头表单。默认单价/类型 为 UI-only（无持久列）。
interface HeaderForm {
  款号?: string;
  款式?: string;
  客户编号?: string;
  客户名称?: string;
  日期?: Dayjs;
  默认单价?: string; // UI-only
  单位?: string;
  类型?: string; // UI-only
}

// BOM物料设置：单据表单（工具条 + 单头两行 + 物料网格 + 底部页签），整组替换保存
export default function BomSetupPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const [form] = Form.useForm<HeaderForm>();
  const [sp] = useSearchParams();
  const 款号Param = sp.get("款号");

  const currentUser = localStorage.getItem("erp_user") || "用户";

  const [loaded款号, setLoaded款号] = useState("");
  const [rows, setRows] = useState<MatRow[]>([]);
  const [saving, setSaving] = useState(false);

  // 打开弹窗
  const [openModal, setOpenModal] = useState(false);
  const [openRows, setOpenRows] = useState<StyleListItem[]>([]);
  const [openKw, setOpenKw] = useState("");
  const [openLoading, setOpenLoading] = useState(false);

  // 物料资料选择弹窗（点物料编号搜索按钮触发，按行回填）
  const [pickRowKey, setPickRowKey] = useState<number | null>(null);
  const [pickRows, setPickRows] = useState<MaterialPick[]>([]);
  const [pickKw, setPickKw] = useState("");
  const [pickLoading, setPickLoading] = useState(false);
  const [pickTotal, setPickTotal] = useState(0);
  const [pickPage, setPickPage] = useState(1);

  // —— 新建：清空表单 ——
  const reset = useCallback(() => {
    setLoaded款号("");
    form.resetFields();
    form.setFieldsValue({ 日期: dayjs(), 默认单价: "HK LCL", 单位: "PCS", 类型: "明细" });
    setRows([newRow()]);
  }, [form]);

  // 初始载入 / URL 带款号自动载入 见 loadDoc 之后的 effect

  // —— 载入既有款号 BOM ——
  const loadDoc = useCallback(async (k: string) => {
    const key = k.trim();
    if (!key) return;
    try {
      const full = await stylesApi.materials(key);
      const first = full.物料?.[0];
      setLoaded款号(key);
      form.setFieldsValue({
        款号: key,
        款式: String(full.款式 ?? ""),
        客户编号: first?.客户编号 ?? undefined,
        客户名称: first?.客户名称 ?? undefined,
        日期: first?.日期 ? dayjs(first.日期) : dayjs(),
        单位: first?.单位 ?? "PCS",
        默认单价: "HK LCL",
        类型: "明细",
      });
      setRows((full.物料 ?? []).map(m => ({
        key: uid(),
        物料编号: m.物料编号 ?? "",
        物料名称: m.物料名称 ?? "",
        工模编号: "", // UI-only，未持久
        规格: m.规格 ?? "",
        材料: m.物料类别 ?? "",
        颜色: m.颜色 ?? "",
        单位: m.单位 ?? "",
        用量: m.使用数量 ?? undefined,
        备注: "", // UI-only，未持久
      })));
      setOpenModal(false);
    } catch (e) {
      message.error(errMsg(e, "款号不存在或加载失败"));
    }
  }, [form]);

  // 初始：URL 带 ?款号= 则自动载入该款号 BOM,否则清空新建
  useEffect(() => {
    if (款号Param) loadDoc(款号Param);
    else reset();
  }, [款号Param, loadDoc, reset]);

  // —— 打开：列表 ——
  const loadOpenList = useCallback(async (kw: string) => {
    setOpenLoading(true);
    try {
      const r = await stylesApi.list(kw);
      setOpenRows(r.items);
    } catch { message.error("加载款号列表失败"); }
    finally { setOpenLoading(false); }
  }, []);

  const onOpen = () => { setOpenModal(true); setOpenKw(""); loadOpenList(""); };

  // —— 物料资料选择 ——
  const loadPickList = useCallback(async (kw: string, page = 1) => {
    setPickLoading(true);
    try {
      const r = await materialsApi.list(page, 50, kw);
      setPickRows(r.items as MaterialPick[]);
      setPickTotal(r.total);
      setPickPage(page);
    } catch { message.error("加载物料资料失败"); }
    finally { setPickLoading(false); }
  }, []);

  const openPicker = (rowKey: number) => {
    setPickRowKey(rowKey);
    setPickKw("");
    loadPickList("", 1);
  };

  const choosePick = (m: MaterialPick) => {
    if (pickRowKey == null) return;
    patch(pickRowKey, {
      物料编号: m.物料编号 ?? "",
      物料名称: m.物料名称 ?? "",
      规格: m.规格 ?? "",
      材料: m.物料类别 ?? "",
      颜色: m.颜色 ?? "",
      单位: m.单位 ?? "",
    });
    setPickRowKey(null);
  };

  // —— 网格操作 ——
  const patch = (key: number, p: Partial<MatRow>) =>
    setRows(rs => rs.map(r => (r.key === key ? { ...r, ...p } : r)));
  const addRow = () => setRows(rs => [...rs, newRow()]);
  const removeRow = (key: number) => setRows(rs => rs.filter(r => r.key !== key));

  // —— 组装保存载荷 ——
  const buildBody = (v: HeaderForm): BomSave => ({
    客户编号: v.客户编号 || undefined,
    客户名称: v.客户名称 || undefined,
    日期: v.日期 ? v.日期.format("YYYY-MM-DD") : undefined,
    单位: v.单位 || undefined,
    明细: rows
      .filter(r => r.物料编号.trim())
      .map(r => ({
        物料编号: r.物料编号.trim(),
        物料名称: r.物料名称.trim() || null,
        物料类别: r.材料.trim() || null,
        规格: r.规格.trim() || null,
        颜色: r.颜色.trim() || null,
        单位: r.单位.trim() || null,
        使用数量: r.用量 ?? null,
      })),
  });

  // —— 保存 ——
  const save = async () => {
    let v: HeaderForm;
    try { v = await form.validateFields(); }
    catch { return; }
    const key = (v.款号 ?? "").trim();
    if (!key) { message.error("请填写款号"); return; }
    const body = buildBody(v);
    if (body.明细.length === 0) { message.error("请至少录入一行含物料编号的明细"); return; }
    setSaving(true);
    try {
      await stylesApi.saveMaterials(key, body);
      message.success("BOM物料已保存");
      await loadDoc(key);
    } catch (e) {
      message.error(errMsg(e, "保存失败，请重试"));
    } finally {
      setSaving(false);
    }
  };

  // —— 删除：清空该款号 BOM（保存空明细）——
  const del = async () => {
    if (!loaded款号) return;
    try {
      await stylesApi.saveMaterials(loaded款号, { 明细: [] });
      message.success("BOM物料已删除");
      reset();
    } catch (e) {
      message.error(errMsg(e, "删除失败"));
    }
  };

  if (!canOpen) {
    return <Result status="403" title="无权限" subTitle="您没有打开「款号资料」的权限。" />;
  }

  // —— 工具条 ——
  const toolbar = (
    <Space wrap>
      {canSave && <Button icon={<FileAddOutlined />} onClick={reset}>新建</Button>}
      <Button icon={<FolderOpenOutlined />} onClick={onOpen}>打开</Button>
      {canSave && (
        <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={save}>保存</Button>
      )}
      {loaded款号 && can(perms, MENU, "删除") && (
        <Popconfirm title={`确认删除款号 ${loaded款号} 的全部 BOM 物料?`} onConfirm={del}>
          <Button danger icon={<DeleteOutlined />}>删除</Button>
        </Popconfirm>
      )}
      <Button icon={<CheckOutlined />} onClick={() => message.info("审核功能开发中")}>审核</Button>
      <Button icon={<CloseOutlined />} onClick={() => message.info("反审核功能开发中")}>反审核</Button>
      <Button icon={<PrinterOutlined />} onClick={() => message.info("打印功能开发中")}>打印</Button>
      <Button icon={<CloseOutlined />} onClick={reset}>关闭</Button>
    </Space>
  );

  // —— 物料网格列 ——
  const textCol = (field: keyof MatRow, title: string, width?: number) => ({
    title, width,
    render: (_v: unknown, r: MatRow) => (
      <Input
        value={r[field] as string}
        onChange={e => patch(r.key, { [field]: e.target.value } as Partial<MatRow>)}
      />
    ),
  });

  const matGrid = (
    <Space direction="vertical" style={{ width: "100%" }} size={12}>
      <Table
        size="small" rowKey="key" pagination={false} dataSource={rows} scroll={{ x: true }}
        columns={[
          {
            title: "", width: 40, align: "center" as const,
            render: (_v: unknown, r: MatRow) => (
              <a style={{ color: "#cf1322" }} onClick={() => removeRow(r.key)}>✕</a>
            ),
          },
          { title: "序号", width: 56, render: (_v: unknown, _r: MatRow, i: number) => i + 1 },
          {
            title: "物料编号", width: 180,
            render: (_v: unknown, r: MatRow) =>
              canSave ? (
                <Input.Search
                  value={r.物料编号}
                  placeholder="点🔍选料"
                  onChange={e => patch(r.key, { 物料编号: e.target.value })}
                  onSearch={() => openPicker(r.key)}
                />
              ) : (
                <Input
                  value={r.物料编号}
                  onChange={e => patch(r.key, { 物料编号: e.target.value })}
                />
              ),
          },
          textCol("物料名称", "物料名称", 140),
          textCol("工模编号", "工模编号", 120),
          textCol("规格", "规格", 120),
          textCol("材料", "材料", 100),
          textCol("颜色", "颜色", 100),
          textCol("单位", "单位", 80),
          {
            title: "用量", width: 110,
            render: (_v: unknown, r: MatRow) => (
              <InputNumber
                style={{ width: "100%" }} min={0}
                value={r.用量}
                onChange={n => patch(r.key, { 用量: n ?? undefined })}
              />
            ),
          },
          textCol("备注", "备注", 140),
        ]}
      />
      <Button icon={<PlusOutlined />} onClick={addRow}>添加行</Button>
    </Space>
  );

  return (
    <Card
      title={`BOM物料设置${loaded款号 ? ` · ${loaded款号}` : "（新建）"}`}
      variant="borderless"
      extra={toolbar}
    >
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name="款号" label="款号" rules={[{ required: true, message: "请填写款号" }]}>
              <Input placeholder="款号" disabled={!!loaded款号} />
            </Form.Item>
          </Col>
          <Col span={4}><Form.Item name="客户编号" label="客户编号"><Input /></Form.Item></Col>
          <Col span={4}><Form.Item name="客户名称" label="客户名称"><Input /></Form.Item></Col>
          <Col span={5}><Form.Item name="日期" label="日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={5}>
            <Form.Item name="默认单价" label="默认单价">
              <Select options={["HK LCL", "HK FOB", "CN"].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}><Form.Item name="款式" label="款式"><Input disabled placeholder="由款号带出" /></Form.Item></Col>
          <Col span={4}><Form.Item name="单位" label="单位"><Input placeholder="PCS" /></Form.Item></Col>
          <Col span={4}>
            <Form.Item label="操作员"><Input value={currentUser} disabled /></Form.Item>
          </Col>
          <Col span={5}>
            <Form.Item name="类型" label="类型">
              <Select options={["明细", "汇总"].map(v => ({ value: v, label: v }))} />
            </Form.Item>
          </Col>
        </Row>
      </Form>

      <Tabs
        items={[
          { key: "mat", label: "物料用量设置", children: matGrid },
          { key: "img", label: "尺寸图片备注", children: <div style={{ padding: 24, color: "#999" }}>功能开发中</div> },
        ]}
      />

      <Modal
        title="打开款号" open={openModal} footer={null} width={680}
        onCancel={() => setOpenModal(false)}
      >
        <Input.Search
          placeholder="搜索款号/款式" allowClear style={{ marginBottom: 12 }}
          value={openKw} onChange={e => setOpenKw(e.target.value)}
          onSearch={v => loadOpenList(v)}
        />
        <Table
          size="small" rowKey="id" loading={openLoading} dataSource={openRows}
          pagination={false} scroll={{ y: 360 }}
          onRow={r => ({ onClick: () => r.款号 && loadDoc(r.款号), style: { cursor: "pointer" } })}
          columns={[
            { title: "款号", dataIndex: "款号", render: (v: string) => <a className="erp-num">{v}</a> },
            { title: "款式", dataIndex: "款式" },
          ]}
        />
      </Modal>

      <Modal
        title="产品资料查询A · 选择物料" open={pickRowKey != null} footer={null} width={760}
        onCancel={() => setPickRowKey(null)}
      >
        <Input.Search
          placeholder="搜索物料编号/名称/规格" allowClear style={{ marginBottom: 12 }}
          value={pickKw} onChange={e => setPickKw(e.target.value)}
          onSearch={v => loadPickList(v, 1)}
        />
        <Table<MaterialPick>
          size="small" rowKey={(_, i) => `m-${i}`} loading={pickLoading} dataSource={pickRows}
          scroll={{ y: 360 }}
          onRow={r => ({ onClick: () => choosePick(r), style: { cursor: "pointer" } })}
          pagination={{
            current: pickPage, pageSize: 50, total: pickTotal,
            showSizeChanger: false, showTotal: t => `共 ${t} 条`,
            onChange: p => loadPickList(pickKw, p),
          }}
          columns={[
            { title: "物料编号", dataIndex: "物料编号", width: 140, render: (v: string) => <a className="erp-num">{v}</a> },
            { title: "物料名称", dataIndex: "物料名称", width: 160 },
            { title: "规格", dataIndex: "规格", width: 120 },
            { title: "材料", dataIndex: "物料类别", width: 100 },
            { title: "颜色", dataIndex: "颜色", width: 90 },
            { title: "单位", dataIndex: "单位", width: 70 },
          ]}
        />
      </Modal>
    </Card>
  );
}
