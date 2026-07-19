import { useMemo, useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Statistic, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, FileAddOutlined, FolderOpenOutlined, LeftOutlined, PrinterOutlined, ProfileOutlined, ReloadOutlined, RightOutlined, SaveOutlined, SearchOutlined, TableOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { semiWarehouseReturnApi, type SRHeader, type SWRDetail } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { mergeSemiWarehouseReturnLines, validateSemiWarehouseReturn, type SWRDraftLine } from "../../utils/semiWarehouseReturn";
import SemiFinishedLabelProductPicker, { type SemiFinishedLabelProduct } from "../semi/SemiFinishedLabelProductPicker";
import SupplierPicker, { type SupplierRow } from "../plastics/SupplierPicker";

const MENU = "半成品退仓";
const user = () => localStorage.getItem("erp_user") || "admin";
const err = (e: unknown, f: string) => (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? f;
type HeaderForm = { 单号?: string; 入仓单号?: string; 供应商编号?: string; 供应商名称?: string; 日期?: Dayjs; 仓库?: string; 备注?: string; 操作员?: string };

function ReceiptPicker({ open, onPick, onClose }: { open: boolean; onPick: (r: SRHeader) => void; onClose: () => void }) {
  const [keyword, setKeyword] = useState(""); const [rows, setRows] = useState<SRHeader[]>([]); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { setRows((await semiWarehouseReturnApi.receipts(1, 100, keyword.trim())).items as unknown as SRHeader[]); } catch { message.error("加载入仓单失败"); } finally { setLoading(false); } };
  return <Modal title="选择原入仓单（仅已审核）" open={open} afterOpenChange={o => { if (o) void load(); }} onCancel={onClose} footer={null} width={940} destroyOnClose>
    <Input.Search allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => void load()} placeholder="单号 / 供应商 / 仓库" style={{ width: 340, marginBottom: 12 }} />
    <Table<SRHeader> rowKey={r => r.单号 ?? String(r.id)} size="small" loading={loading} dataSource={rows} pagination={false} scroll={{ y: 440 }}
      onRow={r => ({ onDoubleClick: () => onPick(r), style: { cursor: "pointer" } })}
      columns={[{ title: "入仓单号", dataIndex: "单号", width: 150 }, { title: "日期", dataIndex: "日期", width: 110, render: v => v?.slice(0, 10) }, { title: "供应商", dataIndex: "供应商名称", width: 220 }, { title: "仓库", dataIndex: "仓库", width: 120 }, { title: "数量", dataIndex: "数量", width: 100, align: "right" }]} />
  </Modal>;
}

function OpenList({ onPick }: { onPick: (no: string) => void }) {
  const [keyword, setKeyword] = useState(""); const [rows, setRows] = useState<SRHeader[]>([]); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { setRows((await semiWarehouseReturnApi.list(1, 100, keyword.trim())).items as unknown as SRHeader[]); } catch { message.error("加载退仓单失败"); } finally { setLoading(false); } };
  return <>
    <Input.Search allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => void load()} onFocus={() => { if (rows.length === 0) void load(); }} placeholder="电脑单号 / 入仓单号 / 供应商" style={{ width: 340, marginBottom: 12 }} />
    <Table<SRHeader> rowKey={r => r.单号 ?? String(r.id)} size="small" loading={loading} dataSource={rows} pagination={false} scroll={{ y: 440 }}
      onRow={r => ({ onDoubleClick: () => r.单号 && onPick(r.单号), style: { cursor: "pointer" } })}
      columns={[{ title: "电脑单号", dataIndex: "单号", width: 150 }, { title: "入仓单号", dataIndex: "入仓单号", width: 150 }, { title: "日期", dataIndex: "日期", width: 110, render: v => v?.slice(0, 10) }, { title: "供应商", dataIndex: "供应商名称", width: 200 }, { title: "数量", dataIndex: "数量", width: 90, align: "right" }, { title: "状态", dataIndex: "审核", width: 90, render: v => <Tag color={v === "1" ? "success" : "default"}>{v === "1" ? "已审核" : "未审核"}</Tag> }]} />
  </>;
}

export default function SemiWarehouseReturnPage() {
  const [form] = Form.useForm<HeaderForm>(); const perms = usePerms(); const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开"), canSave = can(perms, MENU, "保存"), canDelete = can(perms, MENU, "删除"), canAudit = can(perms, MENU, "审核"), canReverse = can(perms, MENU, "反审核"), canPrint = can(perms, MENU, "打印"), canPrice = can(perms, MENU, "单价");
  const [opened, setOpened] = useState<SWRDetail | null>(null); const [lines, setLines] = useState<SWRDraftLine[]>([]); const [busy, setBusy] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false); const [receiptOpen, setReceiptOpen] = useState(false); const [productOpen, setProductOpen] = useState(false); const [openOpen, setOpenOpen] = useState(false);
  const audited = opened?.单头.审核 === "1"; const readOnly = audited || !canSave || busy;

  const reset = () => { form.setFieldsValue({ 单号: "", 入仓单号: "", 供应商编号: "", 供应商名称: "", 日期: dayjs(), 仓库: "", 备注: "", 操作员: user() }); setOpened(null); setLines([]); };
  const apply = (d: SWRDetail) => {
    form.setFieldsValue({ ...d.单头, 日期: dayjs(d.单头.日期), 操作员: d.单头.操作员 ?? user() });
    setLines(d.明细.map((x, i) => ({ key: i + 1, 配件编号: x.配件编号, 客户: x.客户, 产品货号: x.产品货号, 产品名称: x.产品名称, 产品装配名称: x.产品装配名称, 生产单号: x.生产单号, 数量: Number(x.数量), 单价: x.单价 ?? null, 备注: x.备注 ?? "" })));
    setOpened(d);
  };
  const openDoc = async (no: string) => { setBusy(true); try { apply(await semiWarehouseReturnApi.get(no)); } catch (e) { message.error(err(e, "打开退仓单失败")); } finally { setBusy(false); } };
  const selectReceipt = (r: SRHeader) => { form.setFieldsValue({ 入仓单号: r.单号, 供应商编号: r.供应商编号, 供应商名称: r.供应商名称, 仓库: r.仓库 }); setReceiptOpen(false); };
  const pickProducts = (rows: SemiFinishedLabelProduct[]) => setLines(cur => mergeSemiWarehouseReturnLines(cur, rows.map(p => ({ 配件编号: p.配件编号, 客户: p.客户, 产品货号: p.产品货号, 产品名称: p.产品名称, 产品装配名称: p.产品装配名称, 生产单号: (p as { 生产单号?: string | null }).生产单号, 库存单价: p.库存单价 }))));
  const updateLine = (key: number, patch: Partial<SWRDraftLine>) => setLines(v => v.map(x => x.key === key ? { ...x, ...patch } : x));

  const buildPayload = () => {
    const h = form.getFieldsValue();
    const issue = validateSemiWarehouseReturn({ 入仓单号: h.入仓单号, 明细: lines });
    if (issue) { message.error(issue); return null; }
    return { 入仓单号: h.入仓单号!, 日期: (h.日期 ?? dayjs()).format("YYYY-MM-DD"), 供应商编号: h.供应商编号, 供应商名称: h.供应商名称, 仓库: h.仓库 ?? "", 备注: h.备注?.trim(),
      明细: lines.filter(x => x.配件编号.trim() && Number(x.数量) > 0).map(x => ({ 配件编号: x.配件编号, 客户: x.客户, 产品货号: x.产品货号, 产品名称: x.产品名称, 产品装配名称: x.产品装配名称, 生产单号: x.生产单号, 数量: Number(x.数量), 备注: x.备注 })) };
  };
  const save = async () => { const body = buildPayload(); if (!body || readOnly) return; setBusy(true); try { const no = opened ? (await semiWarehouseReturnApi.update(opened.单头.单号, body), opened.单头.单号) : (await semiWarehouseReturnApi.create(body)).单号; apply(await semiWarehouseReturnApi.get(no)); message.success("半成品退仓单已保存"); } catch (e) { message.error(err(e, "保存失败")); } finally { setBusy(false); } };
  const audit = async (reverse: boolean) => { if (!opened) return; setBusy(true); try { if (reverse) await semiWarehouseReturnApi.unapprove(opened.单头.单号); else await semiWarehouseReturnApi.approve(opened.单头.单号); apply(await semiWarehouseReturnApi.get(opened.单头.单号)); message.success(reverse ? "已反审核" : "已审核"); } catch (e) { message.error(err(e, reverse ? "反审核失败" : "审核失败")); } finally { setBusy(false); } };
  const remove = async () => { if (!opened) return; setBusy(true); try { await semiWarehouseReturnApi.remove(opened.单头.单号); reset(); message.success("已删除"); } catch (e) { message.error(err(e, "删除失败")); } finally { setBusy(false); } };
  const move = async (next: boolean) => { if (!opened) return; setBusy(true); try { const d = await semiWarehouseReturnApi.adjacent(opened.单头.单号, next); if (!d) message.info(next ? "已经是最后一张单据" : "已经是第一张单据"); else apply(d); } catch (e) { message.error(err(e, "切换单据失败")); } finally { setBusy(false); } };
  const copy = () => { if (!opened) return; setOpened(null); form.setFieldsValue({ 单号: "", 日期: dayjs(), 操作员: user() }); message.success("已复制为未保存新单"); };

  const totals = useMemo(() => lines.reduce((a, x) => ({ qty: a.qty + Number(x.数量 || 0), amount: a.amount + Number(x.数量 || 0) * Number(x.单价 || 0) }), { qty: 0, amount: 0 }), [lines]);
  const cols: ColumnsType<SWRDraftLine> = [
    { title: "删除", width: 58, fixed: "left", render: (_, x) => <Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => setLines(v => v.filter(y => y.key !== x.key))} /> },
    { title: "配件编号", dataIndex: "配件编号", width: 130 }, { title: "客户", dataIndex: "客户", width: 120 }, { title: "产品货号", dataIndex: "产品货号", width: 140 }, { title: "产品名称", dataIndex: "产品名称", width: 180 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 200 }, { title: "生产单号", dataIndex: "生产单号", width: 140 },
    { title: "数量", dataIndex: "数量", width: 120, align: "right", render: (_, x) => <InputNumber min={0} value={x.数量} disabled={readOnly} onChange={v => updateLine(x.key, { 数量: Number(v ?? 0) })} style={{ width: "100%" }} /> },
    { title: "备注", dataIndex: "备注", width: 180, render: (_, x) => <Input value={x.备注 ?? ""} disabled={readOnly} onChange={e => updateLine(x.key, { 备注: e.target.value })} /> },
  ];

  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  const receiptNo = Form.useWatch("入仓单号", form) ?? "";
  void receiptNo;
  return <Card title="半成品退仓单" variant="borderless" extra={<Space wrap>
    <Button icon={<FileAddOutlined />} disabled={busy} onClick={reset}>新建</Button>
    <Button icon={<FolderOpenOutlined />} disabled={busy} onClick={() => setOpenOpen(true)}>打开</Button>
    <Button type="primary" icon={<SaveOutlined />} disabled={readOnly} loading={busy} onClick={() => void save()}>保存</Button>
    <Popconfirm title="确认删除当前退仓单？" disabled={!opened || audited || !canDelete} onConfirm={() => void remove()}><Button icon={<DeleteOutlined />} disabled={!opened || audited || !canDelete}>删除</Button></Popconfirm>
    <Button icon={<CopyOutlined />} disabled={!opened || !canSave} onClick={copy}>复制单</Button>
    <Button icon={<ReloadOutlined />} disabled={!opened || busy} onClick={() => opened && void openDoc(opened.单头.单号)}>刷新</Button>
    <Button icon={<ProfileOutlined />} disabled={readOnly} onClick={() => setProductOpen(true)}>资料</Button>
    <Button icon={<LeftOutlined />} disabled={!opened || busy} onClick={() => void move(false)}>前单</Button>
    <Button icon={<RightOutlined />} disabled={!opened || busy} onClick={() => void move(true)}>后单</Button>
    <Button icon={<CheckOutlined />} disabled={!opened || audited || !canAudit} onClick={() => void audit(false)}>审核</Button>
    <Button icon={<UndoOutlined />} disabled={!opened || !audited || !canReverse} onClick={() => void audit(true)}>反审核</Button>
    <Button icon={<TableOutlined />} disabled>表格设置</Button>
    <Button icon={<PrinterOutlined />} disabled={!canPrint} onClick={() => window.print()}>打印</Button>
    <Button danger icon={<CloseOutlined />} disabled={busy} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
  </Space>}>
    <Form form={form} layout="vertical" size="small" initialValues={{ 日期: dayjs(), 操作员: user() }}><Row gutter={12}>
      <Col xs={24} sm={12} lg={5}><Form.Item label="供应商" required><Space.Compact style={{ width: "100%" }}><Form.Item name="供应商名称" noStyle><Input readOnly placeholder="选入仓单自动带出" /></Form.Item><Button icon={<SearchOutlined />} disabled={readOnly} onClick={() => setSupplierOpen(true)} /></Space.Compact></Form.Item><Form.Item name="供应商编号" hidden><Input /></Form.Item></Col>
      <Col xs={12} sm={8} lg={3}><Form.Item label="日期" name="日期"><DatePicker disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="电脑单号" name="单号"><Input readOnly placeholder="保存后生成" /></Form.Item></Col>
      <Col xs={24} sm={12} lg={5}><Form.Item label="入仓单号" required><Space.Compact style={{ width: "100%" }}><Form.Item name="入仓单号" noStyle><Input readOnly placeholder="请先选择原入仓单" /></Form.Item><Button icon={<SearchOutlined />} disabled={readOnly} onClick={() => setReceiptOpen(true)} /></Space.Compact></Form.Item></Col>
      <Col xs={24} sm={12} lg={4}><Form.Item label="审核状态"><Tag color={audited ? "success" : "default"}>{audited ? "已审核" : "未审核"}</Tag></Form.Item><Form.Item name="仓库" hidden><Input /></Form.Item></Col>
      <Col xs={24} sm={16} lg={7}><Form.Item label="备注" name="备注"><Input disabled={readOnly} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="操作员" name="操作员"><Input readOnly /></Form.Item></Col>
    </Row></Form>
    <Table<SWRDraftLine> rowKey="key" size="small" columns={cols} dataSource={lines} pagination={false} scroll={{ x: 1400, y: "calc(100vh - 455px)" }} />
    <Space size={48} style={{ marginTop: 14 }}><Statistic title="数量合计" value={totals.qty} /><Statistic title="金额合计" value={canPrice ? totals.amount : 0} precision={2} formatter={canPrice ? undefined : () => "***"} /></Space>
    <SupplierPicker open={supplierOpen} onPick={(s: SupplierRow) => form.setFieldsValue({ 供应商编号: s.供应商编号, 供应商名称: s.供应商名称 })} onClose={() => setSupplierOpen(false)} />
    <ReceiptPicker open={receiptOpen} onPick={selectReceipt} onClose={() => setReceiptOpen(false)} />
    <SemiFinishedLabelProductPicker open={productOpen} permissionMenu={MENU}
      loadProducts={q => semiWarehouseReturnApi.products(q) as unknown as Promise<{ items: SemiFinishedLabelProduct[]; total: number }>}
      onPick={rows => { setProductOpen(false); pickProducts(rows); }} onClose={() => setProductOpen(false)} />
    <Modal title="打开半成品退仓单" open={openOpen} onCancel={() => setOpenOpen(false)} footer={null} width={980} destroyOnClose>
      <OpenList onPick={no => { setOpenOpen(false); void openDoc(no); }} />
    </Modal>
  </Card>;
}
