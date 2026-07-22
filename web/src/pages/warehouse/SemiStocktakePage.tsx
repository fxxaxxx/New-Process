import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Space, Statistic, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, FileAddOutlined, FolderOpenOutlined, LeftOutlined, PrinterOutlined, ProfileOutlined, ReloadOutlined, RightOutlined, SaveOutlined, TableOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { semiStocktakeApi, type STKDetail, type STKHeader } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { mergeSemiStocktakeLines, validateSemiStocktake, type STKDraftLine } from "../../utils/semiStocktake";
import SemiFinishedLabelProductPicker, { type SemiFinishedLabelProduct } from "../semi/SemiFinishedLabelProductPicker";

const MENU = "半成品盘点";
const WAREHOUSE = "半成品仓";
const user = () => localStorage.getItem("erp_user") || "admin";
const err = (e: unknown, f: string) => (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? f;
type HeaderForm = { 单号?: string; 日期?: Dayjs; 备注?: string; 操作员?: string };

export default function SemiStocktakePage() {
  const [form] = Form.useForm<HeaderForm>(); const perms = usePerms(); const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开"), canSave = can(perms, MENU, "保存"), canDelete = can(perms, MENU, "删除"), canAudit = can(perms, MENU, "审核"), canReverse = can(perms, MENU, "反审核"), canPrint = can(perms, MENU, "打印");
  const [opened, setOpened] = useState<STKDetail | null>(null); const [lines, setLines] = useState<STKDraftLine[]>([]); const [busy, setBusy] = useState(false);
  const [productOpen, setProductOpen] = useState(false); const [openOpen, setOpenOpen] = useState(false);
  const sysQtyMap = useRef<Map<string, number>>(new Map());
  const audited = opened?.单头?.审核 === "1"; const readOnly = audited || !canSave || busy;

  // 预载半成品仓库存基准（按配件编号汇总），供选产品时带出系统数量。
  useEffect(() => {
    if (!canOpen) return;
    semiStocktakeApi.basis(WAREHOUSE)
      .then(rows => { sysQtyMap.current = new Map(rows.map(r => [(r.物料编号 ?? "").trim(), Number(r.系统数量 ?? 0)])); })
      .catch(() => { /* 基准加载失败不阻断，系统数量按 0 处理 */ });
  }, [canOpen]);

  const reset = () => { form.setFieldsValue({ 单号: "", 日期: dayjs(), 备注: "", 操作员: user() }); setOpened(null); setLines([]); };
  const apply = (d: STKDetail) => {
    const h = d.单头 ?? {} as STKHeader;
    form.setFieldsValue({ 单号: h.单号, 日期: h.日期 ? dayjs(h.日期) : dayjs(), 备注: h.备注 ?? "", 操作员: h.操作员 ?? user() });
    setLines((d.明细 ?? []).map((x, i) => ({ key: i + 1, 配件编号: x.配件编号 ?? "", 客户: x.客户, 产品货号: x.产品货号, 产品名称: x.产品名称, 产品装配名称: x.产品装配名称, 系统数量: Number(x.系统数量 ?? 0), 盘点数量: Number(x.盘点数量 ?? 0), 备注: x.备注 ?? "" })));
    setOpened(d);
  };
  const openDoc = async (no: string) => { setBusy(true); try { apply(await semiStocktakeApi.get(no)); } catch (e) { message.error(err(e, "打开盘点单失败")); } finally { setBusy(false); } };
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    const no = searchParams.get("open");
    if (no && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      void openDoc(no);
      setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("open"); return n; }, { replace: true });
    }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps
  const pickProducts = (rows: SemiFinishedLabelProduct[]) => setLines(cur => mergeSemiStocktakeLines(cur, rows.map(p => ({ 配件编号: p.配件编号, 客户: p.客户, 产品货号: p.产品货号, 产品名称: p.产品名称, 产品装配名称: p.产品装配名称 })), code => sysQtyMap.current.get(code.trim()) ?? 0));
  const updateLine = (key: number, patch: Partial<STKDraftLine>) => setLines(v => v.map(x => x.key === key ? { ...x, ...patch } : x));

  const buildPayload = () => {
    const h = form.getFieldsValue();
    const issue = validateSemiStocktake({ 明细: lines });
    if (issue) { message.error(issue); return null; }
    return { 日期: (h.日期 ?? dayjs()).format("YYYY-MM-DD"), 仓库: WAREHOUSE, 备注: h.备注?.trim(),
      明细: lines.filter(x => x.配件编号.trim()).map(x => ({ 配件编号: x.配件编号, 客户: x.客户, 产品货号: x.产品货号, 产品名称: x.产品名称, 产品装配名称: x.产品装配名称, 系统数量: Number(x.系统数量 || 0), 盘点数量: Number(x.盘点数量 || 0), 备注: x.备注 })) };
  };
  const save = async () => { const body = buildPayload(); if (!body || readOnly) return; setBusy(true); try { const no = opened?.单头 ? (await semiStocktakeApi.update(opened.单头.单号!, body), opened.单头.单号!) : (await semiStocktakeApi.create(body)).单号; apply(await semiStocktakeApi.get(no)); message.success("半成品盘点单已保存"); } catch (e) { message.error(err(e, "保存失败")); } finally { setBusy(false); } };
  const audit = async (reverse: boolean) => { if (!opened?.单头?.单号) return; setBusy(true); try { reverse ? await semiStocktakeApi.unapprove(opened.单头.单号) : await semiStocktakeApi.approve(opened.单头.单号); apply(await semiStocktakeApi.get(opened.单头.单号)); message.success(reverse ? "已反审核" : "已审核"); } catch (e) { message.error(err(e, reverse ? "反审核失败" : "审核失败")); } finally { setBusy(false); } };
  const remove = async () => { if (!opened?.单头?.单号) return; setBusy(true); try { await semiStocktakeApi.remove(opened.单头.单号); reset(); message.success("已删除"); } catch (e) { message.error(err(e, "删除失败")); } finally { setBusy(false); } };
  const move = async (next: boolean) => { if (!opened?.单头?.单号) return; setBusy(true); try { const d = await semiStocktakeApi.adjacent(opened.单头.单号, next); if (!d) message.info(next ? "已经是最后一张单据" : "已经是第一张单据"); else apply(d); } catch (e) { message.error(err(e, "切换单据失败")); } finally { setBusy(false); } };
  const copy = () => { if (!opened) return; setOpened(null); form.setFieldsValue({ 单号: "", 日期: dayjs(), 操作员: user() }); message.success("已复制为未保存新单"); };

  const totals = useMemo(() => lines.reduce((a, x) => ({ sys: a.sys + Number(x.系统数量 || 0), cnt: a.cnt + Number(x.盘点数量 || 0), diff: a.diff + (Number(x.盘点数量 || 0) - Number(x.系统数量 || 0)) }), { sys: 0, cnt: 0, diff: 0 }), [lines]);
  const cols: ColumnsType<STKDraftLine> = [
    { title: "删除", width: 58, fixed: "left", render: (_, x) => <Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => setLines(v => v.filter(y => y.key !== x.key))} /> },
    { title: "配件编号", dataIndex: "配件编号", width: 130 }, { title: "产品货号", dataIndex: "产品货号", width: 140 }, { title: "产品名称", dataIndex: "产品名称", width: 170 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 190 },
    { title: "系统数量", dataIndex: "系统数量", width: 110, align: "right" },
    { title: "盘点数量", dataIndex: "盘点数量", width: 120, align: "right", render: (_, x) => <InputNumber min={0} value={x.盘点数量} disabled={readOnly} onChange={v => updateLine(x.key, { 盘点数量: Number(v ?? 0) })} style={{ width: "100%" }} /> },
    { title: "盈亏数量", width: 110, align: "right", render: (_, x) => { const d = Number(x.盘点数量 || 0) - Number(x.系统数量 || 0); return <span style={{ color: d < 0 ? "#cf1322" : d > 0 ? "#389e0d" : undefined }}>{d}</span>; } },
    { title: "备注", dataIndex: "备注", width: 160, render: (_, x) => <Input value={x.备注 ?? ""} disabled={readOnly} onChange={e => updateLine(x.key, { 备注: e.target.value })} /> },
  ];

  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  return <Card title="半成品盘点单" variant="borderless" extra={<Space wrap>
    <Button icon={<FileAddOutlined />} disabled={busy} onClick={reset}>新建</Button>
    <Button icon={<FolderOpenOutlined />} disabled={busy} onClick={() => setOpenOpen(true)}>打开</Button>
    <Button type="primary" icon={<SaveOutlined />} disabled={readOnly} loading={busy} onClick={() => void save()}>保存</Button>
    <Popconfirm title="确认删除当前盘点单？" disabled={!opened || audited || !canDelete} onConfirm={() => void remove()}><Button icon={<DeleteOutlined />} disabled={!opened || audited || !canDelete}>删除</Button></Popconfirm>
    <Button icon={<CopyOutlined />} disabled={!opened || !canSave} onClick={copy}>复制单</Button>
    <Button icon={<ReloadOutlined />} disabled={!opened || busy} onClick={() => opened?.单头?.单号 && void openDoc(opened.单头.单号)}>刷新</Button>
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
      <Col xs={12} sm={8} lg={4}><Form.Item label="日期" name="日期"><DatePicker disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={5}><Form.Item label="电脑单号" name="单号"><Input readOnly placeholder="保存后生成" /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="操作员" name="操作员"><Input readOnly /></Form.Item></Col>
      <Col xs={24} sm={16} lg={7}><Form.Item label="备注" name="备注"><Input disabled={readOnly} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="审核状态"><Tag color={audited ? "success" : "default"}>{audited ? "已审核" : "未审核"}</Tag></Form.Item></Col>
    </Row></Form>
    <Table<STKDraftLine> rowKey="key" size="small" columns={cols} dataSource={lines} pagination={false} scroll={{ x: 1230, y: "calc(100vh - 430px)" }} />
    <Space size={48} style={{ marginTop: 14 }}>
      <Statistic title="系统数量" value={totals.sys} />
      <Statistic title="盘点数量" value={totals.cnt} />
      <Statistic title="盈亏数量" value={totals.diff} valueStyle={{ color: totals.diff < 0 ? "#cf1322" : totals.diff > 0 ? "#389e0d" : undefined }} />
    </Space>
    <SemiFinishedLabelProductPicker open={productOpen} permissionMenu={MENU} goodsTitle="共用产品货号" nameTitle="共用产品名称"
      loadProducts={q => semiStocktakeApi.products(q) as unknown as Promise<{ items: SemiFinishedLabelProduct[]; total: number }>}
      onPick={rows => { setProductOpen(false); pickProducts(rows); }} onClose={() => setProductOpen(false)} />
    <Modal title="打开半成品盘点单" open={openOpen} onCancel={() => setOpenOpen(false)} footer={null} width={900} destroyOnClose>
      <OpenList onPick={no => { setOpenOpen(false); void openDoc(no); }} />
    </Modal>
  </Card>;
}

function OpenList({ onPick }: { onPick: (no: string) => void }) {
  const [keyword, setKeyword] = useState(""); const [rows, setRows] = useState<STKHeader[]>([]); const [loading, setLoading] = useState(false);
  const load = async () => { setLoading(true); try { setRows((await semiStocktakeApi.list(1, 100, keyword.trim())).items as STKHeader[]); } catch { message.error("加载盘点单失败"); } finally { setLoading(false); } };
  return <>
    <Input.Search allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => void load()} onFocus={() => rows.length === 0 && void load()} placeholder="电脑单号 / 仓库" style={{ width: 320, marginBottom: 12 }} />
    <Table<STKHeader> rowKey={r => r.单号 ?? String(r.ID ?? r.id)} size="small" loading={loading} dataSource={rows} pagination={false} scroll={{ y: 440 }}
      onRow={r => ({ onDoubleClick: () => r.单号 && onPick(r.单号), style: { cursor: "pointer" } })}
      columns={[{ title: "电脑单号", dataIndex: "单号", width: 150 }, { title: "日期", dataIndex: "日期", width: 110, render: v => v?.slice(0, 10) }, { title: "系统数量", dataIndex: "系统数量", width: 90, align: "right" }, { title: "盘点数量", dataIndex: "盘点数量", width: 90, align: "right" }, { title: "盈亏数量", dataIndex: "盈亏数量", width: 90, align: "right" }, { title: "状态", dataIndex: "审核", width: 90, render: v => <Tag color={v === "1" ? "success" : "default"}>{v === "1" ? "已审核" : "未审核"}</Tag> }]} />
  </>;
}
