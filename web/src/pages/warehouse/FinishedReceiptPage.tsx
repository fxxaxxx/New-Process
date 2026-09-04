import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, FileAddOutlined, FolderOpenOutlined, LeftOutlined, PrinterOutlined, ProfileOutlined, ReloadOutlined, RightOutlined, SaveOutlined, SearchOutlined, TableOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { finishedReceiptApi, type FRCreate, type FRDetail, type FRHeader } from "../../api/finished";
import { productionApi } from "../../api/production";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { mergeFinishedReceiptProducts, summarizeFinishedReceiptLines, validateFinishedReceipt, type FinishedReceiptEditableLine } from "../../utils/finishedReceiptOrder";
import SemiFinishedLabelProductPicker, { type SemiFinishedLabelProduct } from "../semi/SemiFinishedLabelProductPicker";
import SupplierPicker, { type SupplierRow } from "../plastics/SupplierPicker";
import { useAutoReload } from "../../hooks/useAutoReload";

const MENU = "成品入仓";
const currentUser = () => localStorage.getItem("erp_user") || "admin";
const blankLine = (key: number): FinishedReceiptEditableLine => ({ key, 配件编号: "", 产品货号: "", 数量: 0 });
const errText = (e: unknown, f: string) => (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? f;
interface HeaderForm { 供应商编号?: string; 供应商名称?: string; 日期?: Dayjs; 订单单号?: string; 入库单号?: string; 单号?: string; 仓库?: string; 备注?: string; 操作员?: string }

export default function FinishedReceiptPage() {
  const perms = usePerms(); const navigate = useNavigate();
  const [form] = Form.useForm<HeaderForm>();
  const canOpen = can(perms, MENU, "打开"), canSave = can(perms, MENU, "保存"), canDelete = can(perms, MENU, "删除"), canAudit = can(perms, MENU, "审核"), canReverse = can(perms, MENU, "反审核"), canPrint = can(perms, MENU, "打印");
  const [lines, setLines] = useState<FinishedReceiptEditableLine[]>([blankLine(1)]);
  const [opened, setOpened] = useState<FRDetail | null>(null); const [busy, setBusy] = useState(false);
  const [productOpen, setProductOpen] = useState(false); const [supplierOpen, setSupplierOpen] = useState(false); const [openOpen, setOpenOpen] = useState(false);
  const audited = opened?.单头?.审核 === "1"; const readOnly = audited || !canSave || busy;

  const reset = () => { form.setFieldsValue({ 供应商编号: "", 供应商名称: "", 日期: dayjs(), 订单单号: "", 入库单号: "", 单号: "", 仓库: "成品仓", 备注: "", 操作员: currentUser() }); setLines([blankLine(1)]); setOpened(null); };
  const applyDetail = (d: FRDetail) => {
    const h = d.单头;
    form.setFieldsValue({ 供应商编号: h?.供应商编号 ?? "", 供应商名称: h?.供应商名称 ?? "", 日期: h?.日期 ? dayjs(h.日期) : dayjs(), 订单单号: h?.订单单号 ?? "", 入库单号: h?.入库单号 ?? "", 单号: h?.单号 ?? "", 仓库: h?.仓库 ?? "成品仓", 备注: h?.备注 ?? "", 操作员: h?.操作员 ?? currentUser() });
    const loaded = (d.明细 ?? []).map((x, i) => ({ key: i + 1, 订单单号: x.订单单号 ?? "", 配件编号: x.配件编号 ?? "", 客户: x.客户, 产品货号: x.产品货号 ?? "", 产品名称: x.产品名称, 产品装配名称: x.产品装配名称, 生产单号: x.生产单号 ?? "", 箱数: x.箱数, 数量: Number(x.数量 ?? 0), 单价: x.单价 ?? 0, 备注: x.备注 ?? "" }));
    setLines([...loaded, blankLine(loaded.length + 1)]); setOpened(d);
  };
  const openDoc = async (no: string) => { setBusy(true); try { applyDetail(await finishedReceiptApi.get(no)); } catch (e) { message.error(errText(e, "打开成品入仓单失败")); } finally { setBusy(false); } };

  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    const no = searchParams.get("open");
    if (no && !autoOpenedRef.current) { autoOpenedRef.current = true; void openDoc(no); setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("open"); return n; }, { replace: true }); }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // 从「查询生产单」跳入：URL ?mo=<生产单号> 新建单并按生产制单的货号明细带入行（产品货号/生产单号/数量）
  const moRef = useRef<string | null>(null);
  useEffect(() => {
    const mo = searchParams.get("mo");
    if (!mo) { moRef.current = null; return; }
    if (moRef.current === mo) return;
    moRef.current = mo;
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("mo"); return n; }, { replace: true });
    if (opened?.单头?.单号) return;
    (async () => {
      try {
        const d = await productionApi.get(mo);
        const po = d.单头?.合同号 ?? "";   // 订单单号=客户PO号(生产制单.合同号)
        if (po) form.setFieldsValue({ 订单单号: po });
        const goods = (d.货号明细 ?? []).filter(g => g.货号);
        if (goods.length > 0) {
          // 配件编号=货号(成品入仓以货号为明细主键,校验/库存都按它),客户/名称顺带带出
          setLines([...goods.map((g, i) => ({
            key: i + 1, 订单单号: po, 配件编号: g.货号 ?? "", 客户: d.单头?.客户名称 ?? null,
            产品货号: g.货号 ?? "", 产品名称: g.款号名称 ?? d.单头?.款式 ?? null,
            产品装配名称: g.款号名称 ?? d.单头?.款式 ?? null, 生产单号: mo, 数量: Number(g.数量 ?? 0),
          })), blankLine(goods.length + 1)]);
          message.info(`已带入生产单号 ${mo} 的 ${goods.length} 个货号，请核对数量后保存`);
        } else {
          setLines([{ ...blankLine(1), 订单单号: po, 生产单号: mo }]);
          message.info(`已带入生产单号 ${mo}，请完善明细后保存`);
        }
      } catch {
        setLines([{ ...blankLine(1), 生产单号: mo }]);
        message.info(`已带入生产单号 ${mo}，请完善明细后保存`);
      }
    })();
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = (): FRCreate | null => {
    const v = form.getFieldsValue();
    const actual = lines.filter(l => l.配件编号.trim());
    const issue = validateFinishedReceipt({ 仓库: v.仓库, 明细: actual });
    if (issue) { message.error(issue); return null; }
    return { 日期: (v.日期 ?? dayjs()).format("YYYY-MM-DD"), 订单单号: v.订单单号?.trim(), 入库单号: v.入库单号?.trim(), 仓库: v.仓库 ?? "成品仓", 供应商编号: v.供应商编号?.trim(), 供应商名称: v.供应商名称?.trim(), 备注: v.备注?.trim(), 明细: actual.map(l => ({ 订单单号: l.订单单号, 配件编号: l.配件编号, 客户: l.客户, 产品货号: l.产品货号, 产品名称: l.产品名称, 产品装配名称: l.产品装配名称, 生产单号: l.生产单号, 箱数: l.箱数, 数量: Number(l.数量), 单价: l.单价 ?? 0, 备注: l.备注 })) };
  };
  const save = async () => { const body = payload(); if (!body || readOnly) return; setBusy(true); try { if (opened?.单头?.单号) applyDetail(await finishedReceiptApi.update(opened.单头.单号, body)); else { const c = await finishedReceiptApi.create(body); applyDetail(await finishedReceiptApi.get(c.单号)); } message.success("成品入仓单已保存"); } catch (e) { message.error(errText(e, "保存失败")); } finally { setBusy(false); } };
  const remove = async () => { const no = opened?.单头?.单号; if (!no) return; setBusy(true); try { await finishedReceiptApi.remove(no); reset(); message.success("已删除"); } catch (e) { message.error(errText(e, "删除失败")); } finally { setBusy(false); } };
  const audit = async (reverse = false) => { const no = opened?.单头?.单号; if (!no) return; setBusy(true); try { reverse ? await finishedReceiptApi.unapprove(no) : await finishedReceiptApi.approve(no); applyDetail(await finishedReceiptApi.get(no)); message.success(reverse ? "已反审核" : "已审核"); } catch (e) { message.error(errText(e, reverse ? "反审核失败" : "审核失败")); } finally { setBusy(false); } };
  const adjacent = async (dir: "previous" | "next") => { const no = opened?.单头?.单号; if (!no) return; setBusy(true); try { const d = await finishedReceiptApi.adjacent(no, dir); if (d) applyDetail(d); else message.info(dir === "previous" ? "已经是第一张单据" : "已经是最后一张单据"); } catch { message.error("切换单据失败"); } finally { setBusy(false); } };
  const copy = () => { setOpened(null); form.setFieldsValue({ 单号: "", 入库单号: "", 日期: dayjs(), 操作员: currentUser() }); setLines(cur => cur.map((l, i) => ({ ...l, key: i + 1 }))); message.success("已复制为新单"); };
  const updateLine = (key: number, patch: Partial<FinishedReceiptEditableLine>) => setLines(cur => cur.map(l => l.key === key ? { ...l, ...patch } : l));
  const removeLine = (key: number) => setLines(cur => { const n = cur.filter(l => l.key !== key).map((l, i) => ({ ...l, key: i + 1 })); return n.length ? n : [blankLine(1)]; });
  const pickProducts = (ps: SemiFinishedLabelProduct[]) => setLines(cur => { const actual = cur.filter(l => l.配件编号.trim()); const merged = mergeFinishedReceiptProducts(actual, ps as never); return [...merged, blankLine(merged.length + 1)]; });
  const pickSupplier = (row: SupplierRow) => form.setFieldsValue({ 供应商编号: row.供应商编号 ?? "", 供应商名称: row.供应商名称 ?? "" });
  const summary = useMemo(() => summarizeFinishedReceiptLines(lines), [lines]);
  const totals = useMemo(() => lines.reduce((a, l) => ({ qty: a.qty + Number(l.数量 || 0), box: a.box + Number(l.箱数 || 0), amount: a.amount + Number(l.数量 || 0) * Number(l.单价 || 0) }), { qty: 0, box: 0, amount: 0 }), [lines]);

  const columns: ColumnsType<FinishedReceiptEditableLine> = [
    { title: "删除", width: 58, fixed: "left", render: (_, r) => <Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => removeLine(r.key)} /> },
    { title: "订单单号", dataIndex: "订单单号", width: 140, render: (_, r) => <Input value={r.订单单号 ?? ""} disabled={readOnly} onChange={e => updateLine(r.key, { 订单单号: e.target.value })} /> },
    { title: "配件编号", dataIndex: "配件编号", width: 130, render: (_, r) => <Input value={r.配件编号} readOnly disabled={readOnly} suffix={<SearchOutlined />} onClick={() => !readOnly && setProductOpen(true)} /> },
    { title: "客户", dataIndex: "客户", width: 110 }, { title: "产品货号", dataIndex: "产品货号", width: 150 }, { title: "产品名称", dataIndex: "产品名称", width: 180 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 190 },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (_, r) => <Input value={r.生产单号 ?? ""} disabled={readOnly} onChange={e => updateLine(r.key, { 生产单号: e.target.value })} /> },
    { title: "箱数", dataIndex: "箱数", width: 100, align: "right", render: (_, r) => <InputNumber min={0} value={r.箱数 ?? undefined} disabled={readOnly} onChange={v => updateLine(r.key, { 箱数: v == null ? null : Number(v) })} style={{ width: "100%" }} /> },
    { title: "数量", dataIndex: "数量", width: 110, align: "right", render: (_, r) => <InputNumber min={0} value={r.数量} disabled={readOnly} onChange={v => updateLine(r.key, { 数量: Number(v ?? 0) })} style={{ width: "100%" }} /> },
    { title: "备注", dataIndex: "备注", width: 150, render: (_, r) => <Input value={r.备注 ?? ""} disabled={readOnly} onChange={e => updateLine(r.key, { 备注: e.target.value })} /> },
  ];

  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  return <Card title="成品入仓单" variant="borderless" extra={<Space wrap>
    <Button icon={<FileAddOutlined />} onClick={reset} disabled={busy}>新建</Button>
    <Button icon={<FolderOpenOutlined />} onClick={() => setOpenOpen(true)} disabled={busy}>打开</Button>
    <Button type="primary" icon={<SaveOutlined />} onClick={() => void save()} disabled={readOnly} loading={busy}>保存</Button>
    <Popconfirm title="确认删除当前单据？" disabled={!opened?.单头?.单号 || audited || !canDelete} onConfirm={() => void remove()}><Button danger icon={<DeleteOutlined />} disabled={!opened?.单头?.单号 || audited || !canDelete}>删除</Button></Popconfirm>
    <Button icon={<CopyOutlined />} onClick={copy} disabled={!opened || !canSave}>复制单</Button>
    <Button icon={<ReloadOutlined />} onClick={() => opened?.单头?.单号 && void openDoc(opened.单头.单号)} disabled={!opened || busy}>刷新</Button>
    <Button icon={<ProfileOutlined />} onClick={() => setProductOpen(true)} disabled={readOnly}>资料</Button>
    <Button icon={<LeftOutlined />} onClick={() => void adjacent("previous")} disabled={!opened || busy}>前单</Button>
    <Button icon={<RightOutlined />} onClick={() => void adjacent("next")} disabled={!opened || busy}>后单</Button>
    <Button icon={<CheckOutlined />} onClick={() => void audit()} disabled={!opened || audited || !canAudit}>审核</Button>
    <Button icon={<UndoOutlined />} onClick={() => void audit(true)} disabled={!opened || !audited || !canReverse}>反审核</Button>
    <Button icon={<TableOutlined />} disabled>表格设置</Button>
    <Button icon={<PrinterOutlined />} onClick={() => window.print()} disabled={!canPrint}>打印</Button>
    <Button danger icon={<CloseOutlined />} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
  </Space>}>
    <Form form={form} layout="vertical" size="small" initialValues={{ 日期: dayjs(), 仓库: "成品仓", 操作员: currentUser() }}>
      <Row gutter={12}>
        <Col xs={24} md={8} xl={5}><Form.Item label="供应商"><Space.Compact style={{ width: "100%" }}><Form.Item name="供应商名称" noStyle><Input readOnly placeholder="请选择供应商" /></Form.Item><Button icon={<SearchOutlined />} onClick={() => setSupplierOpen(true)} disabled={readOnly} /></Space.Compact><Form.Item name="供应商编号" hidden><Input /></Form.Item></Form.Item></Col>
        <Col xs={12} md={6} xl={4}><Form.Item label="日期" name="日期"><DatePicker disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="订单单号" name="订单单号"><Input disabled={readOnly} /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="电脑单号" name="单号"><Input readOnly placeholder="保存后生成" /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="入库单号"><Input readOnly placeholder="保存后生成" value={opened?.单头?.单号 ?? ""} /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="收货仓库" name="仓库"><Select disabled={readOnly} options={[{ value: "成品仓", label: "成品仓" }, { value: "半成品仓", label: "半成品仓" }]} /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="操作员" name="操作员"><Input readOnly /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="审核状态"><Tag color={audited ? "success" : "default"}>{audited ? "已审核" : "未审核"}</Tag></Form.Item></Col>
        <Col xs={24} md={12} xl={8}><Form.Item label="备注" name="备注"><Input disabled={readOnly} /></Form.Item></Col>
      </Row>
    </Form>
    <Row gutter={12}>
      <Col xs={24} xl={17}><Table<FinishedReceiptEditableLine> rowKey="key" size="small" pagination={false} dataSource={lines} columns={columns} scroll={{ x: 1520, y: "calc(100vh - 470px)" }} /></Col>
      <Col xs={24} xl={7}><Table rowKey="key" size="small" pagination={false} dataSource={summary} columns={[{ title: "序号", dataIndex: "序号", width: 60 }, { title: "配件编号", dataIndex: "配件编号", width: 120 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 180 }, { title: "入仓数量", dataIndex: "入仓数量", width: 100, align: "right" }]} scroll={{ x: 460, y: "calc(100vh - 470px)" }} /></Col>
    </Row>
    <Space size={42} style={{ marginTop: 14 }} wrap><Statistic title="数量" value={totals.qty} /><Statistic title="金额" value={totals.amount} precision={2} /><Statistic title="箱数" value={totals.box} /></Space>
    <SemiFinishedLabelProductPicker open={productOpen} onPick={rows => { setProductOpen(false); pickProducts(rows); }} onClose={() => setProductOpen(false)} loadProducts={q => finishedReceiptApi.products(q) as unknown as Promise<{ items: SemiFinishedLabelProduct[]; total: number }>} permissionMenu={MENU} goodsTitle="产品货号" nameTitle="产品名称" />
    <SupplierPicker open={supplierOpen} onPick={pickSupplier} onClose={() => setSupplierOpen(false)} />
    <Modal title="打开成品入仓单" open={openOpen} onCancel={() => setOpenOpen(false)} footer={null} width={900} destroyOnClose>
      <OpenList onPick={no => { setOpenOpen(false); void openDoc(no); }} />
    </Modal>
  </Card>;
}

function OpenList({ onPick }: { onPick: (no: string) => void }) {
  const [keyword, setKeyword] = useState(""); const [rows, setRows] = useState<FRHeader[]>([]); const [loading, setLoading] = useState(false);
  const load = async (silent = false) => { setLoading(true); try { setRows((await finishedReceiptApi.list(1, 100, keyword.trim())).items as FRHeader[]); } catch { if (!silent) message.error("加载成品入仓单失败"); } finally { setLoading(false); } };
  // 弹窗打开期间,切回本页/窗口聚焦/30秒轮询 自动刷新列表;silent 失败不弹 toast
  useAutoReload(() => { void load(true); });
  return <>
    <Input.Search allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => void load()} onFocus={() => rows.length === 0 && void load()} placeholder="电脑单号 / 订单单号 / 供应商 / 仓库" style={{ width: 340, marginBottom: 12 }} />
    <Table<FRHeader> rowKey={r => r.单号 ?? String(r.ID ?? r.id)} size="small" loading={loading} dataSource={rows} pagination={false} scroll={{ y: 440 }}
      onRow={r => ({ onDoubleClick: () => r.单号 && onPick(r.单号), style: { cursor: "pointer" } })}
      columns={[{ title: "电脑单号", dataIndex: "单号", width: 150 }, { title: "订单单号", dataIndex: "订单单号", width: 130 }, { title: "日期", dataIndex: "日期", width: 110, render: v => v?.slice(0, 10) }, { title: "供应商", dataIndex: "供应商名称", width: 150 }, { title: "数量", dataIndex: "数量", width: 90, align: "right" }, { title: "状态", dataIndex: "审核", width: 90, render: v => <Tag color={v === "1" ? "success" : "default"}>{v === "1" ? "已审核" : "未审核"}</Tag> }]} />
  </>;
}
