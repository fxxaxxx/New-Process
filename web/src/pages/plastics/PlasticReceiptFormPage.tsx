import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { plasticSupplierDocApi, type PSDHeader, type PSDLine } from "../../api/plasticSupplierDoc";
import { plasticDocApi } from "../../api/plasticDocs";
import { plasticMaterialSettingsApi } from "../../api/plasticMaterialSettings";
import { plasticPurchaseProgressApi, type PlasticPurchaseProgressRow } from "../../api/plasticPurchaseProgress";
import { plasticPurchaseOrderApi } from "../../api/plasticPurchaseOrder";
import type { PlasticMaterialRow } from "../../api/plasticMaterialMaster";
import { prefillDefaultWarehouse } from "../../utils/plasticSettings";
import SupplierPicker from "./SupplierPicker";
import PlasticReceiptPicker from "./PlasticReceiptPicker";
import PlasticReceiptLineTable from "./PlasticReceiptLineTable";
import type { PlasticReceiptFormCfg } from "./PlasticReceiptFormConfigs";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // ISO 格式：后端 DateTime 反序列化要求
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function PlasticReceiptFormPage({ cfg }: { cfg: PlasticReceiptFormCfg }) {
  const MENU = cfg.menu;
  const docApi = useMemo(() => plasticSupplierDocApi(cfg.resource), [cfg.resource]);
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [lines, setLines] = useState<PSDLine[]>([]);
  const [rows, setRows] = useState<PSDHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [ppoOpen, setPpoOpen] = useState(false);                       // 从采购单带入弹窗(仅塑胶入仓)
  const [ppoRows, setPpoRows] = useState<PlasticPurchaseProgressRow[]>([]); // 已审核单的欠数行
  const [ppoKw, setPpoKw] = useState("");
  const [ppoLoading, setPpoLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]); // 历史单据勾选 id
  const [batchApproving, setBatchApproving] = useState(false);          // 批量审核中
  const readOnly = opened !== null;

  // 塑胶物料设置消费: 选物料后表头仓库为空时按设置的默认仓库预填(不覆盖已填)。
  const handleMaterialPicked = useCallback((row: PlasticMaterialRow) => {
    const code = (row.物料编号 ?? "").trim();
    if (!code) return;
    void plasticMaterialSettingsApi.lookup(code).then(s => {
      const wh = prefillDefaultWarehouse(form.getFieldValue("仓库") as string | undefined, s?.默认仓库);
      if (wh) form.setFieldValue("仓库", wh);
    }).catch(() => { /* 未设置/不可达则不预填 */ });
  }, [form]);

  const loadRows = useCallback(async () => {
    try { setRows((await docApi.list(1, 50, "")).items); }
    catch { message.error("加载单据失败"); }
  }, [docApi]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 日期: today(), 操作员: currentUser() });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset, cfg.resource]);

  const bringFromReceipt = async (单号: string) => {
    try {
      const d = await plasticDocApi("plastic-receipts").get(单号);
      const h = d.单头 as { 供应商编号?: string; 供应商名称?: string; 订单单号?: string } | undefined;
      form.setFieldsValue({ 入仓单号: 单号, 供应商编号: h?.供应商编号, 供应商名称: h?.供应商名称, 订单单号: h?.订单单号 });
      setLines((d.明细 ?? []).map(l => {
        const x = l as { 订单单号?: string; 生产单号?: string; 款号?: string; 工模编号?: string; 塑胶货号?: string };
        return {
          订单单号: x.订单单号, 生产单号: x.生产单号, 款号: x.款号,
          工模编号: x.工模编号, 物料编号: l.物料编号, 物料名称: l.物料名称,
          规格: l.规格, 颜色: l.颜色, 塑胶货号: x.塑胶货号, 仓位号: l.仓位号, 单位: l.单位,
          数量: Number(l.数量 ?? 0), 单价: l.单价 ?? undefined,
        };
      }));
      message.success(`已带出入仓单 ${单号} 的明细`);
    } catch { message.error("带出入仓单明细失败"); }
  };

  // 「从采购单带入」数据源:塑胶进度表欠数行(不限日期),只保留已审核单
  const loadPpo = useCallback(async () => {
    setPpoLoading(true);
    try { setPpoRows((await plasticPurchaseProgressApi.list({ onlyOwed: true })).filter(r => r.审核 === "1")); }
    catch { message.error("加载塑胶采购订单失败"); }
    finally { setPpoLoading(false); }
  }, []);

  // 弹窗内按 采购单号 去重列出欠数单,关键字前端过滤(进度表 keyword 不匹配单号)
  const ppoOrders = useMemo(() => {
    const m = new Map<string, PlasticPurchaseProgressRow>();
    for (const r of ppoRows) if (r.采购单号 && !m.has(r.采购单号)) m.set(r.采购单号, r);
    const kw = ppoKw.trim();
    return [...m.values()].filter(r => !kw || (r.采购单号 ?? "").includes(kw) || (r.供应商名称 ?? "").includes(kw));
  }, [ppoRows, ppoKw]);

  // 从采购单带入:该单全部欠数行,数量=欠数(默认全收);表头 供应商/订单单号 带出
  const bringFromPurchaseOrder = async (单号: string) => {
    try {
      const owed = ppoRows.filter(r => r.采购单号 === 单号);
      if (owed.length === 0) { message.warning(`采购单 ${单号} 无欠数行`); return; }
      const d = await plasticPurchaseOrderApi.get(单号);   // 进度表无供应商编号,取单头补齐
      form.setFieldsValue({
        供应商编号: d.单头?.供应商编号,
        供应商名称: d.单头?.供应商名称 ?? owed[0].供应商名称,
        订单单号: 单号,
      });
      const mapped: PSDLine[] = owed.map(r => ({
        订单单号: 单号,
        生产单号: r.生产单号 ?? undefined,
        款号: r.款号 ?? undefined,
        工模编号: r.模具编号 ?? undefined,
        物料编号: r.物料编号 ?? undefined,
        物料名称: r.物料名称 ?? undefined,
        颜色: r.颜色 ?? undefined,
        单位: r.单位 ?? undefined,
        数量: Number(r.欠数 ?? 0),
      }));
      setLines(prev => [...prev.filter(l => l.物料编号), ...mapped]);   // 丢弃空白行后追加
      message.success(`已带入 ${owed.length} 行(默认全收)`);
      setPpoOpen(false);
    } catch { message.error("从采购单带入失败"); }
  };

  const openDoc = async (单号: string) => {
    try {
      const d = await docApi.get(单号);
      const h = d.单头 ?? {} as PSDHeader;
      form.setFieldsValue({
        供应商编号: h.供应商编号, 供应商名称: h.供应商名称, 仓库: h.仓库, 备注: h.备注,
        日期: h.日期?.slice(0, 10), 操作员: h.操作员, 入仓单号: h.入仓单号, 电脑单号: h.电脑单号, 订单单号: h.订单单号,
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
    setSaving(true);
    try {
      await docApi.create({ ...v, 明细: ok });
      message.success(`${cfg.title}单已创建`); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  // 批量审核:只对勾选的未审核单逐张调审核接口,汇总成功/失败后刷新列表
  const batchApprove = async () => {
    const targets = rows.filter(r => selectedRowKeys.includes(r.id) && r.审核 !== "1");
    if (targets.length === 0) { message.info("勾选的单据均已审核"); return; }
    setBatchApproving(true);
    let ok = 0; const fails: string[] = [];
    for (const r of targets) {
      try { await docApi.approve(r.单号!); ok++; }
      catch (e) { fails.push((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "审核失败"); }
    }
    setBatchApproving(false);
    setSelectedRowKeys([]);
    if (fails.length === 0) message.success(`已审核 ${ok} 张`);
    else message.warning(`已审核 ${ok} 张,失败 ${fails.length} 张(${fails[0]})`);
    loadRows();
  };

  const 数量合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0), 0);
  const 金额合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0) * Number(l.单价 ?? 0), 0);

  const listColumns = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "供应商", dataIndex: "供应商名称", key: "供应商名称" },
    { title: "仓库", dataIndex: "仓库", key: "仓库" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: PSDHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => docApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => docApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该单据?" onConfirm={() => act(() => docApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title={`${cfg.title}单${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
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
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setSupplierOpen(true)} />} />
            </Form.Item>
            <Form.Item name="供应商编号" hidden><Input /></Form.Item>
          </Col>
          <Col span={4}><Form.Item name="日期" label="日期"><Input disabled /></Form.Item></Col>
          <Col span={5}>
            <Form.Item name="入仓单号" label="入库单号">
              {cfg.allowReceiptPick
                ? <Input readOnly placeholder="点🔍选入仓单带出"
                    suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setReceiptOpen(true)} />} />
                : <Input disabled={readOnly} />}
            </Form.Item>
          </Col>
          <Col span={5}><Form.Item name="订单单号" label="订单单号"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="电脑单号" label="电脑单号"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={3}><Form.Item name="仓库" label="仓库" rules={[{ required: true, message: "请填仓库" }]}><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
          <Col span={17}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      {cfg.resource === "plastic-receipts" && !readOnly && (
        <Space style={{ marginBottom: 8 }}>
          <Button onClick={() => { setPpoOpen(true); setPpoKw(""); loadPpo(); }}>从采购单带入</Button>
        </Space>
      )}
      <PlasticReceiptLineTable value={lines} onChange={setLines} readOnly={readOnly} hidePrice={priceHidden} onMaterialPicked={handleMaterialPicked} />

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={数量合计} />
        {!priceHidden && <Statistic title="金额合计" value={金额合计.toFixed(2)} />}
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        {can(perms, MENU, "审核") && (
          <Space style={{ marginBottom: 8 }}>
            <Button loading={batchApproving} disabled={selectedRowKeys.length === 0} onClick={batchApprove}>批量审核</Button>
          </Space>
        )}
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }}
          rowSelection={{ selectedRowKeys, onChange: ks => setSelectedRowKeys(ks as number[]) }} />
      </div>

      <SupplierPicker open={supplierOpen}
        onPick={row => form.setFieldsValue({ 供应商编号: row.供应商编号, 供应商名称: row.供应商名称 })}
        onClose={() => setSupplierOpen(false)} />
      {cfg.allowReceiptPick && <PlasticReceiptPicker open={receiptOpen} onPick={bringFromReceipt} onClose={() => setReceiptOpen(false)} />}
      <Modal title="从塑胶采购订单带入（仅列已审核、有欠数）" open={ppoOpen} onCancel={() => setPpoOpen(false)} footer={null} width={640}>
        <Input placeholder="采购单号/供应商名称 过滤" allowClear style={{ width: 260, marginBottom: 12 }}
          value={ppoKw} onChange={e => setPpoKw(e.target.value)} />
        <Table size="small" rowKey="采购单号" loading={ppoLoading} dataSource={ppoOrders}
          pagination={{ pageSize: 8 }} scroll={{ y: 360 }}
          columns={[
            { title: "采购单号", dataIndex: "采购单号", render: (v: string) => <span className="erp-num">{v}</span> },
            { title: "供应商", dataIndex: "供应商名称" },
            { title: "订购日期", dataIndex: "订购日期", width: 110, render: (v?: string) => v?.slice(0, 10) },
          ]}
          onRow={r => ({ onClick: () => { if (r.采购单号) bringFromPurchaseOrder(r.采购单号); }, style: { cursor: "pointer" } })} />
        <div style={{ marginTop: 8, color: "#888" }}>点单号带入该单全部欠数行,数量默认=欠数(全收)</div>
      </Modal>
    </Card>
  );
}
