import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, Popconfirm, Row, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { plasticPurchaseOrderApi, type PPOHeader, type PPOLine } from "../../api/plasticPurchaseOrder";
import SupplierPicker from "./SupplierPicker";
import ProductionPicker from "../materials/ProductionPicker";
import PlasticPurchaseOrderLineTable from "./PlasticPurchaseOrderLineTable";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "塑胶采购订单";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // ISO 格式：后端 DateTime 反序列化要求
const currentUser = () => localStorage.getItem("erp_user") ?? "";

interface MergeRow { 序号: number; 物料编号: string; 物料名称?: string; 数量合计: number; 入仓合计: number | null; 欠数合计: number | null }

export default function PlasticPurchaseOrderPage() {
  const perms = usePerms();
  const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const [form] = Form.useForm<Record<string, unknown>>();
  const [lines, setLines] = useState<PPOLine[]>([]);
  const [rows, setRows] = useState<PPOHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const readOnly = opened !== null;

  const loadRows = useCallback(async () => {
    try { setRows((await plasticPurchaseOrderApi.list(1, 50, "")).items); }
    catch { message.error("加载单据失败"); }
  }, []);
  useEffect(() => { if (canOpen) loadRows(); }, [canOpen, loadRows]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 日期: today(), 操作员: currentUser() });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset]);

  const bringFromProduction = async (生产单号: string) => {
    if (!生产单号) return;
    try {
      const bom = await plasticPurchaseOrderApi.basis(生产单号);
      setLines(bom.map(b => ({
        生产单号: b.生产单号, 款号: b.款号, 物料编号: b.物料编号, 物料名称: b.物料名称,
        模具编号: b.模具编号, 用量: b.用量 ?? undefined, 套数: b.套数 ?? undefined,
        数量: 0, 颜色: b.颜色, 色粉号: b.色粉号, 用料名称: b.用料名称,
      })));
      message.success(`已调入生产单 ${生产单号} 的 BOM 明细`);
    } catch { message.error("调入清单失败"); }
  };

  const openDoc = async (单号: string) => {
    try {
      const d = await plasticPurchaseOrderApi.get(单号);
      const h = d.单头 ?? {} as PPOHeader;
      form.setFieldsValue({
        供应商编号: h.供应商编号, 供应商名称: h.供应商名称, 客户名称: h.客户名称,
        交货地点: h.交货地点, 编号: h.编号, 备注: h.备注, 操作员: h.操作员,
        日期: h.日期?.slice(0, 10),
        交货日期: h.交货日期 ? dayjs(h.交货日期) : undefined,
      });
      setLines(d.明细 ?? []); setOpened(单号);
    } catch { message.error("打开单据失败"); }
  };

  const save = async () => {
    if (readOnly) { message.info("查看模式:请先「新建」再录入"); return; }
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.物料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有效物料明细(物料编号+数量)"); return; }
    const 交货日期 = v.交货日期 ? (v.交货日期 as dayjs.Dayjs).format("YYYY-MM-DD") : null;
    setSaving(true);
    try {
      await plasticPurchaseOrderApi.create({ ...v, 交货日期, 明细: ok });
      message.success("塑胶采购订单已创建"); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const 数量合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0), 0);

  const mergeRows = useMemo<MergeRow[]>(() => {
    const map = new Map<string, MergeRow>();
    for (const l of lines) {
      const k = l.物料编号 ?? "";
      if (!k) continue;
      const cur = map.get(k);
      if (cur) {
        cur.数量合计 += Number(l.数量 ?? 0);
        if (l.入仓数量 != null) cur.入仓合计 = Number(cur.入仓合计 ?? 0) + l.入仓数量;
        if (l.欠数 != null) cur.欠数合计 = Number(cur.欠数合计 ?? 0) + l.欠数;
      } else {
        map.set(k, {
          序号: 0, 物料编号: k, 物料名称: l.物料名称, 数量合计: Number(l.数量 ?? 0),
          入仓合计: l.入仓数量 != null ? l.入仓数量 : null,
          欠数合计: l.欠数 != null ? l.欠数 : null,
        });
      }
    }
    return Array.from(map.values()).map((r, i) => ({ ...r, 序号: i + 1 }));
  }, [lines]);

  // 收货进度状态:欠 N(红) / 已完成(绿) / 超收 N(橙);无入仓数据(新建录入)留空
  const owedStatus = (欠: number | null) => {
    if (欠 == null) return "";
    if (欠 > 0) return <b style={{ color: "#cf1322" }}>欠 {欠}</b>;
    if (欠 < 0) return <b style={{ color: "#fa8c16" }}>超收 {Math.abs(欠)}</b>;
    return <b style={{ color: "#52c41a" }}>已完成</b>;
  };

  const mergeColumns: ColumnsType<MergeRow> = [
    { title: "序号", dataIndex: "序号", width: 56 },
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 130 },
    { title: "数量合计", dataIndex: "数量合计", width: 90, align: "right" },
    { title: "已入仓", dataIndex: "入仓合计", width: 90, align: "right", render: (v: number | null) => v ?? "" },
    { title: "欠数", dataIndex: "欠数合计", width: 100, align: "right", render: (v: number | null) => owedStatus(v) },
  ];

  const listColumns: ColumnsType<PPOHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "供应商", dataIndex: "供应商名称", key: "供应商名称" },
    { title: "客户", dataIndex: "客户名称", key: "客户名称" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: PPOHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => plasticPurchaseOrderApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => plasticPurchaseOrderApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 === "1" && <a onClick={() => navigate(`/plastic-receipts?ppo=${encodeURIComponent(row.单号!)}`)}>下推入仓</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该单据?" onConfirm={() => act(() => plasticPurchaseOrderApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶采购订单·打开"权限）。</div></Card>;
  }

  return (
    <Card title={`塑胶采购订单${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
      extra={
        <Space wrap>
          <Button onClick={reset}>新建</Button>
          {can(perms, MENU, "保存") && <Button type="primary" loading={saving} disabled={readOnly} onClick={save}>保存</Button>}
          <Button disabled={readOnly} onClick={() => setProdOpen(true)}>调入清单</Button>
          <Button onClick={() => window.print()}>打印</Button>
        </Space>
      }>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name="供应商名称" label="供应商" rules={[{ required: true, message: "请选供应商" }]}>
              <Input readOnly placeholder="点🔍选供应商"
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setSupplierOpen(true)} />} />
            </Form.Item>
            <Form.Item name="供应商编号" hidden><Input /></Form.Item>
          </Col>
          <Col span={4}><Form.Item name="日期" label="日期"><Input disabled /></Form.Item></Col>
          <Col span={4}><Form.Item name="交货日期" label="交货日期"><DatePicker style={{ width: "100%" }} disabled={readOnly} /></Form.Item></Col>
          <Col span={5}><Form.Item name="客户名称" label="客户名称"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={5}><Form.Item name="交货地点" label="交货地点"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={5}><Form.Item name="编号" label="编号"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
          <Col span={15}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <PlasticPurchaseOrderLineTable value={lines} onChange={setLines} readOnly={readOnly} />

      <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>物料清单(合并)</div>
      <Table size="small" rowKey="物料编号" pagination={false} dataSource={mergeRows} columns={mergeColumns} />

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={数量合计} />
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }} />
      </div>

      <SupplierPicker open={supplierOpen}
        onPick={row => form.setFieldsValue({ 供应商编号: row.供应商编号, 供应商名称: row.供应商名称 })}
        onClose={() => setSupplierOpen(false)} />
      <ProductionPicker open={prodOpen} onPick={row => bringFromProduction(row.生产单号 ?? "")} onClose={() => setProdOpen(false)} />
    </Card>
  );
}
