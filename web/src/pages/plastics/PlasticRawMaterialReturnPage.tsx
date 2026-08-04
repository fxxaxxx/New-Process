import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialReturnApi, type RTNHeader, type RTNLine } from "../../api/plasticRawMaterialReturn";
import { plasticRawMaterialReceiptApi, type RMRHeader } from "../../api/plasticRawMaterialReceipt";
import SupplierPicker from "./SupplierPicker";
import PlasticRawMaterialReturnLineTable from "./PlasticRawMaterialReturnLineTable";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "原料退仓单";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // ISO 格式：后端 DateTime 反序列化要求
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function PlasticRawMaterialReturnPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [lines, setLines] = useState<RTNLine[]>([]);
  const [rows, setRows] = useState<RTNHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [supOpen, setSupOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receipts, setReceipts] = useState<RMRHeader[]>([]);
  const readOnly = opened !== null;

  const loadRows = useCallback(async () => {
    try { setRows((await plasticRawMaterialReturnApi.list(1, 50, "")).items); }
    catch { message.error("加载原料退仓单失败"); }
  }, []);
  useEffect(() => { if (canOpen) loadRows(); }, [canOpen, loadRows]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 日期: today(), 操作员: currentUser(), 单价类型: "格式HK$/Lb" });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset]);

  const openDoc = async (单号: string) => {
    try {
      const d = await plasticRawMaterialReturnApi.get(单号);
      const h = d.单头 ?? {} as RTNHeader;
      form.setFieldsValue({
        供应商编号: h.供应商编号, 供应商名称: h.供应商名称, 备注: h.备注, 操作员: h.操作员,
        日期: h.日期?.slice(0, 10), 电脑单号: h.电脑单号, 入仓单号: h.入仓单号, 单价类型: h.单价类型,
      });
      setLines(d.明细 ?? []); setOpened(单号);
    } catch { message.error("打开原料退仓单失败"); }
  };

  // 入仓单调入:弹已审核原料入仓单列表
  const openReceiptPicker = async () => {
    try {
      const res = await plasticRawMaterialReceiptApi.list(1, 50, "");
      setReceipts(res.items.filter(o => o.审核 === "1"));
      setReceiptOpen(true);
    } catch { message.error("加载原料入仓单失败"); }
  };
  const pickReceipt = async (单号: string) => {
    try {
      const d = await plasticRawMaterialReceiptApi.get(单号);
      const imported: RTNLine[] = (d.明细 ?? []).map(l => ({
        原料编号: l.原料编号, 原料名称: l.原料名称, 产地: l.产地, 每包重量: l.每包重量 ?? undefined,
        单价类型: l.单价类型, 单位: l.单位, 数量: Number(l.数量 ?? 0), 单价: l.单价 ?? undefined, 备注: l.备注,
      }));
      setLines(imported);
      form.setFieldsValue({ 入仓单号: 单号, 供应商编号: d.单头?.供应商编号, 供应商名称: d.单头?.供应商名称 });
      setReceiptOpen(false);
      message.success(`已调入入仓单 ${单号} 的 ${imported.length} 行明细`);
    } catch { message.error("调入入仓单失败"); }
  };

  const save = async () => {
    if (readOnly) { message.info("查看模式:请先「新建」再录入"); return; }
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.原料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有效明细(原料编号+数量)"); return; }
    setSaving(true);
    try {
      await plasticRawMaterialReturnApi.create({ ...v, 明细: ok });
      message.success("原料退仓单已创建"); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const 数量合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0), 0);
  const 金额合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0) * Number(l.单价 ?? 0), 0);

  const listColumns: ColumnsType<RTNHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "供应商", dataIndex: "供应商名称", key: "供应商名称" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "入仓单号", dataIndex: "入仓单号", key: "入仓单号" },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: RTNHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => plasticRawMaterialReturnApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => plasticRawMaterialReturnApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该原料退仓单?" onConfirm={() => act(() => plasticRawMaterialReturnApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const receiptColumns: ColumnsType<RMRHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => pickReceipt(v)}>{v}</a> },
    { title: "供应商", dataIndex: "供应商名称", key: "供应商名称" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料退仓单·打开"权限）。</div></Card>;
  }

  return (
    <Card title={`原料退仓单${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
      extra={
        <Space wrap>
          <Button onClick={reset}>新建</Button>
          {can(perms, MENU, "保存") && <Button type="primary" loading={saving} disabled={readOnly} onClick={save}>保存</Button>}
          <Button onClick={() => window.print()}>打印</Button>
        </Space>
      }>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name="供应商名称" label="供应商" rules={[{ required: true, message: "请选供应商" }]}>
              <Input readOnly placeholder="点🔍选供应商"
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setSupOpen(true)} />} />
            </Form.Item>
            <Form.Item name="供应商编号" hidden><Input /></Form.Item>
          </Col>
          <Col span={3}><Form.Item name="日期" label="日期"><Input disabled /></Form.Item></Col>
          <Col span={4}><Form.Item name="电脑单号" label="电脑单号"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}>
            <Form.Item name="入仓单号" label="入仓单号">
              <Input readOnly placeholder="点🔍调入入仓单"
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={openReceiptPicker} />} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item name="单价类型" label="单价类型">
              <Select disabled={readOnly} options={[{ value: "格式HK$/Lb" }, { value: "格式HK$/kg" }, { value: "格式RMB/kg" }]} />
            </Form.Item>
          </Col>
          <Col span={3}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={12}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <PlasticRawMaterialReturnLineTable value={lines} onChange={setLines} readOnly={readOnly} hidePrice={priceHidden} />

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={数量合计} precision={2} />
        {!priceHidden && <Statistic title="金额合计" value={金额合计} precision={2} />}
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }} />
      </div>

      <SupplierPicker open={supOpen}
        onPick={row => form.setFieldsValue({ 供应商编号: row.供应商编号, 供应商名称: row.供应商名称 })}
        onClose={() => setSupOpen(false)} />

      <Modal open={receiptOpen} title="选择已审核原料入仓单调入明细" footer={null} width={640} onCancel={() => setReceiptOpen(false)}>
        <Table rowKey="id" size="small" dataSource={receipts} columns={receiptColumns} pagination={{ pageSize: 8 }} scroll={{ x: "max-content", y: 380 }} />
      </Modal>
    </Card>
  );
}
