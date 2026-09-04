import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, FileAddOutlined, FolderOpenOutlined, LeftOutlined, PrinterOutlined, ProfileOutlined, ReloadOutlined, RightOutlined, SaveOutlined, SearchOutlined, ShoppingOutlined, TableOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { semiIssueApi, semiInventoryApi, type SIDetail, type SIHeader, type SemiStockRow } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { mergeSemiIssueLines, validateSemiIssue, type SIDraftLine } from "../../utils/semiIssue";
import SemiFinishedLabelProductPicker, { type SemiFinishedLabelProduct } from "../semi/SemiFinishedLabelProductPicker";
import EmployeePicker from "../materials/EmployeePicker";
import { useAutoReload } from "../../hooks/useAutoReload";

const MENU = "半成品领料";
const WAREHOUSE = "半成品仓";
const 领料备注选项 = ["生产领料", "补料", "返工领料"];
const user = () => localStorage.getItem("erp_user") || "admin";
const err = (e: unknown, f: string) => (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? f;
type HeaderForm = { 单号?: string; 部门?: string; 领料人?: string; 拉长?: string; 收件人?: string; 领料备注?: string; 件数?: number | null; 卡板数?: number | null; 制单人?: string; 日期?: Dayjs; 备注?: string; 操作员?: string };

export default function SemiIssuePage() {
  const [form] = Form.useForm<HeaderForm>(); const perms = usePerms(); const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开"), canSave = can(perms, MENU, "保存"), canDelete = can(perms, MENU, "删除"), canAudit = can(perms, MENU, "审核"), canReverse = can(perms, MENU, "反审核"), canPrint = can(perms, MENU, "打印");
  const [opened, setOpened] = useState<SIDetail | null>(null); const [lines, setLines] = useState<SIDraftLine[]>([]); const [busy, setBusy] = useState(false);
  const [productOpen, setProductOpen] = useState(false); const [openOpen, setOpenOpen] = useState(false);
  const [empField, setEmpField] = useState<"领料人" | "拉长" | "收件人" | "制单人" | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});
  const audited = opened?.单头?.审核 === "1"; const readOnly = audited || !canSave || busy;

  useEffect(() => { void (async () => {
    try { const rows: SemiStockRow[] = await semiInventoryApi.list(WAREHOUSE); const m: Record<string, number> = {}; for (const r of rows) m[(r.物料编号 ?? "").trim()] = (m[(r.物料编号 ?? "").trim()] ?? 0) + Number(r.库存 ?? 0); setStockMap(m); } catch { /* 库存参考失败不阻塞 */ }
  })(); }, [opened]);

  const reset = () => { form.setFieldsValue({ 单号: "", 部门: "", 领料人: "", 拉长: "", 收件人: "", 领料备注: 领料备注选项[0], 件数: null, 卡板数: null, 制单人: user(), 日期: dayjs(), 备注: "", 操作员: user() }); setOpened(null); setLines([]); };
  const apply = (d: SIDetail) => {
    const h = d.单头 ?? {} as SIHeader;
    form.setFieldsValue({ 单号: h.单号, 部门: h.部门 ?? "", 领料人: h.领料人 ?? "", 拉长: h.拉长 ?? "", 收件人: h.收件人 ?? "", 领料备注: h.领料备注 ?? 领料备注选项[0], 件数: h.件数 ?? null, 卡板数: h.卡板数 ?? null, 制单人: h.制单人 ?? user(), 日期: h.日期 ? dayjs(h.日期) : dayjs(), 备注: h.备注 ?? "", 操作员: h.操作员 ?? user() });
    setLines((d.明细 ?? []).map((x, i) => ({ key: i + 1, 配件编号: x.配件编号 ?? "", 客户: x.客户, 产品货号: x.产品货号, 产品名称: x.产品名称, 产品装配名称: x.产品装配名称, 生产单号: x.生产单号, 数量: Number(x.数量 ?? 0), 备注: x.备注 ?? "" })));
    setOpened(d);
  };
  const openDoc = async (no: string) => { setBusy(true); try { apply(await semiIssueApi.get(no)); } catch (e) { message.error(err(e, "打开出库单失败")); } finally { setBusy(false); } };
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
  const pickProducts = (rows: SemiFinishedLabelProduct[]) => setLines(cur => mergeSemiIssueLines(cur, rows.map(p => ({ 配件编号: p.配件编号, 客户: p.客户, 产品货号: p.产品货号, 产品名称: p.产品名称, 产品装配名称: p.产品装配名称, 生产单号: (p as { 生产单号?: string | null }).生产单号 }))));
  const updateLine = (key: number, patch: Partial<SIDraftLine>) => setLines(v => v.map(x => x.key === key ? { ...x, ...patch } : x));

  const buildPayload = () => {
    const h = form.getFieldsValue();
    const issue = validateSemiIssue({ 明细: lines });
    if (issue) { message.error(issue); return null; }
    return { 日期: (h.日期 ?? dayjs()).format("YYYY-MM-DD"), 仓库: WAREHOUSE, 部门: h.部门, 领料人: h.领料人, 拉长: h.拉长, 收件人: h.收件人, 领料备注: h.领料备注, 件数: h.件数 ?? null, 卡板数: h.卡板数 ?? null, 制单人: h.制单人, 备注: h.备注?.trim(),
      明细: lines.filter(x => x.配件编号.trim() && Number(x.数量) > 0).map(x => ({ 配件编号: x.配件编号, 客户: x.客户, 产品货号: x.产品货号, 产品名称: x.产品名称, 产品装配名称: x.产品装配名称, 生产单号: x.生产单号, 数量: Number(x.数量), 备注: x.备注 })) };
  };
  const save = async () => { const body = buildPayload(); if (!body || readOnly) return; setBusy(true); try { const no = opened?.单头 ? (await semiIssueApi.update(opened.单头.单号!, body), opened.单头.单号!) : (await semiIssueApi.create(body)).单号; apply(await semiIssueApi.get(no)); message.success("半成品出库单已保存"); } catch (e) { message.error(err(e, "保存失败")); } finally { setBusy(false); } };
  const audit = async (reverse: boolean) => { if (!opened?.单头?.单号) return; setBusy(true); try { reverse ? await semiIssueApi.unapprove(opened.单头.单号) : await semiIssueApi.approve(opened.单头.单号); apply(await semiIssueApi.get(opened.单头.单号)); message.success(reverse ? "已反审核" : "已审核"); } catch (e) { message.error(err(e, reverse ? "反审核失败" : "审核失败")); } finally { setBusy(false); } };
  const remove = async () => { if (!opened?.单头?.单号) return; setBusy(true); try { await semiIssueApi.remove(opened.单头.单号); reset(); message.success("已删除"); } catch (e) { message.error(err(e, "删除失败")); } finally { setBusy(false); } };
  const move = async (next: boolean) => { if (!opened?.单头?.单号) return; setBusy(true); try { const d = await semiIssueApi.adjacent(opened.单头.单号, next); if (!d) message.info(next ? "已经是最后一张单据" : "已经是第一张单据"); else apply(d); } catch (e) { message.error(err(e, "切换单据失败")); } finally { setBusy(false); } };
  const copy = () => { if (!opened) return; setOpened(null); form.setFieldsValue({ 单号: "", 日期: dayjs(), 操作员: user() }); message.success("已复制为未保存新单"); };

  const totalQty = useMemo(() => lines.reduce((a, x) => a + Number(x.数量 || 0), 0), [lines]);
  const stockRows = useMemo(() => lines.map((l, i) => ({ key: l.key, 序号: i + 1, 配件编号: l.配件编号, 产品装配名称: l.产品装配名称 ?? "", 发料数量: Number(l.数量 || 0), 库存数量: stockMap[l.配件编号.trim()] ?? 0 })), [lines, stockMap]);

  const cols: ColumnsType<SIDraftLine> = [
    { title: "删除", width: 58, fixed: "left", render: (_, x) => <Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => setLines(v => v.filter(y => y.key !== x.key))} /> },
    { title: "装配采购", width: 90, render: () => "" },
    { title: "配件编号", dataIndex: "配件编号", width: 130 }, { title: "客户", dataIndex: "客户", width: 110 }, { title: "产品货号", dataIndex: "产品货号", width: 140 }, { title: "产品名称", dataIndex: "产品名称", width: 170 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 190 }, { title: "生产单号", dataIndex: "生产单号", width: 140 },
    { title: "数量", dataIndex: "数量", width: 120, align: "right", render: (_, x) => <InputNumber min={0} value={x.数量} disabled={readOnly} onChange={v => updateLine(x.key, { 数量: Number(v ?? 0) })} style={{ width: "100%" }} /> },
    { title: "备注", dataIndex: "备注", width: 160, render: (_, x) => <Input value={x.备注 ?? ""} disabled={readOnly} onChange={e => updateLine(x.key, { 备注: e.target.value })} /> },
  ];
  const stockCols: ColumnsType<(typeof stockRows)[number]> = [
    { title: "序号", dataIndex: "序号", width: 56 }, { title: "配件编号", dataIndex: "配件编号", width: 120 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 160 },
    { title: "发料数量", dataIndex: "发料数量", width: 90, align: "right" }, { title: "库存数量", dataIndex: "库存数量", width: 90, align: "right" },
  ];

  if (!canOpen) return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  const pick = (name: string) => { setEmpField(name as typeof empField); };
  return <Card title="半成品出库单" variant="borderless" extra={<Space wrap>
    <Button icon={<FileAddOutlined />} disabled={busy} onClick={reset}>新建</Button>
    <Button icon={<FolderOpenOutlined />} disabled={busy} onClick={() => setOpenOpen(true)}>打开</Button>
    <Button type="primary" icon={<SaveOutlined />} disabled={readOnly} loading={busy} onClick={() => void save()}>保存</Button>
    <Popconfirm title="确认删除当前出库单？" disabled={!opened || audited || !canDelete} onConfirm={() => void remove()}><Button icon={<DeleteOutlined />} disabled={!opened || audited || !canDelete}>删除</Button></Popconfirm>
    <Button icon={<ShoppingOutlined />} disabled title="装配采购清单（后续）">装配采购清单</Button>
    <Button icon={<ReloadOutlined />} disabled={!opened || busy} onClick={() => opened?.单头?.单号 && void openDoc(opened.单头.单号)}>刷新</Button>
    <Button icon={<ProfileOutlined />} disabled={readOnly} onClick={() => setProductOpen(true)}>资料</Button>
    <Button icon={<LeftOutlined />} disabled={!opened || busy} onClick={() => void move(false)}>前单</Button>
    <Button icon={<RightOutlined />} disabled={!opened || busy} onClick={() => void move(true)}>后单</Button>
    <Button icon={<CopyOutlined />} disabled={!opened || !canSave} onClick={copy}>复制单</Button>
    <Button icon={<CheckOutlined />} disabled={!opened || audited || !canAudit} onClick={() => void audit(false)}>审核</Button>
    <Button icon={<UndoOutlined />} disabled={!opened || !audited || !canReverse} onClick={() => void audit(true)}>反审核</Button>
    <Button icon={<TableOutlined />} disabled>表格设置</Button>
    <Button icon={<PrinterOutlined />} disabled={!canPrint} onClick={() => window.print()}>打印</Button>
    <Button danger icon={<CloseOutlined />} disabled={busy} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
  </Space>}>
    <Form form={form} layout="vertical" size="small" initialValues={{ 日期: dayjs(), 操作员: user(), 制单人: user(), 领料备注: 领料备注选项[0] }}><Row gutter={12}>
      <Col xs={12} sm={8} lg={4}><Form.Item label="部门" name="部门"><Input disabled={readOnly} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={3}><Form.Item label="日期" name="日期"><DatePicker disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="审核日期"><Input readOnly value={opened?.单头?.审核日期 ? String(opened.单头.审核日期).slice(0, 10) : ""} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="领料人" required><Space.Compact style={{ width: "100%" }}><Form.Item name="领料人" noStyle><Input readOnly /></Form.Item><Button icon={<SearchOutlined />} disabled={readOnly} onClick={() => pick("领料人")} /></Space.Compact></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="拉长"><Space.Compact style={{ width: "100%" }}><Form.Item name="拉长" noStyle><Input readOnly /></Form.Item><Button icon={<SearchOutlined />} disabled={readOnly} onClick={() => pick("拉长")} /></Space.Compact></Form.Item></Col>
      <Col xs={12} sm={8} lg={5}><Form.Item label="电脑单号" name="单号"><Input readOnly placeholder="保存后生成" /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="收件人"><Space.Compact style={{ width: "100%" }}><Form.Item name="收件人" noStyle><Input readOnly /></Form.Item><Button icon={<SearchOutlined />} disabled={readOnly} onClick={() => pick("收件人")} /></Space.Compact></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="领料备注" name="领料备注"><Select disabled={readOnly} options={领料备注选项.map(v => ({ value: v, label: v }))} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={3}><Form.Item label="件数" name="件数"><InputNumber min={0} disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={3}><Form.Item label="卡板数" name="卡板数"><InputNumber min={0} disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={4}><Form.Item label="制单人"><Space.Compact style={{ width: "100%" }}><Form.Item name="制单人" noStyle><Input readOnly /></Form.Item><Button icon={<SearchOutlined />} disabled={readOnly} onClick={() => pick("制单人")} /></Space.Compact></Form.Item></Col>
      <Col xs={24} sm={16} lg={6}><Form.Item label="备注" name="备注"><Input disabled={readOnly} /></Form.Item></Col>
      <Col xs={12} sm={8} lg={3}><Form.Item label="操作员" name="操作员"><Input readOnly /></Form.Item></Col>
      <Col xs={12} sm={8} lg={3}><Form.Item label="审核状态"><Tag color={audited ? "success" : "default"}>{audited ? "已审核" : "未审核"}</Tag></Form.Item></Col>
    </Row></Form>
    <Row gutter={12}>
      <Col span={17}>
        <Table<SIDraftLine> rowKey="key" size="small" columns={cols} dataSource={lines} pagination={false} scroll={{ x: 1300, y: "calc(100vh - 470px)" }} />
        <Space size={48} style={{ marginTop: 14 }}><Statistic title="数量合计" value={totalQty} /></Space>
      </Col>
      <Col span={7}>
        <Table rowKey="key" size="small" columns={stockCols} dataSource={stockRows} pagination={false} scroll={{ y: "calc(100vh - 420px)" }} title={() => "库存参考"} />
      </Col>
    </Row>
    <SemiFinishedLabelProductPicker open={productOpen} permissionMenu={MENU}
      loadProducts={q => semiIssueApi.products(q) as unknown as Promise<{ items: SemiFinishedLabelProduct[]; total: number }>}
      onPick={rows => { setProductOpen(false); pickProducts(rows); }} onClose={() => setProductOpen(false)} />
    <EmployeePicker open={empField !== null} onPick={(name: string) => { if (empField) form.setFieldsValue({ [empField]: name }); setEmpField(null); }} onClose={() => setEmpField(null)} />
    <Modal title="打开半成品出库单" open={openOpen} onCancel={() => setOpenOpen(false)} footer={null} width={900} destroyOnClose>
      <OpenList onPick={no => { setOpenOpen(false); void openDoc(no); }} />
    </Modal>
  </Card>;
}

function OpenList({ onPick }: { onPick: (no: string) => void }) {
  const [keyword, setKeyword] = useState(""); const [rows, setRows] = useState<SIHeader[]>([]); const [loading, setLoading] = useState(false);
  const load = async (silent = false) => { setLoading(true); try { setRows((await semiIssueApi.list(1, 100, keyword.trim())).items as SIHeader[]); } catch { if (!silent) message.error("加载出库单失败"); } finally { setLoading(false); } };
  // 弹窗打开期间,切回本页/窗口聚焦/30秒轮询 自动刷新列表;silent 失败不弹 toast
  useAutoReload(() => { void load(true); });
  return <>
    <Input.Search allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => void load()} onFocus={() => rows.length === 0 && void load()} placeholder="电脑单号 / 仓库 / 领料人" style={{ width: 320, marginBottom: 12 }} />
    <Table<SIHeader> rowKey={r => r.单号 ?? String(r.ID ?? r.id)} size="small" loading={loading} dataSource={rows} pagination={false} scroll={{ y: 440 }}
      onRow={r => ({ onDoubleClick: () => r.单号 && onPick(r.单号), style: { cursor: "pointer" } })}
      columns={[{ title: "电脑单号", dataIndex: "单号", width: 150 }, { title: "日期", dataIndex: "日期", width: 110, render: v => v?.slice(0, 10) }, { title: "部门", dataIndex: "部门", width: 120 }, { title: "领料人", dataIndex: "领料人", width: 100 }, { title: "数量", dataIndex: "数量", width: 90, align: "right" }, { title: "状态", dataIndex: "审核", width: 90, render: v => <Tag color={v === "1" ? "success" : "default"}>{v === "1" ? "已审核" : "未审核"}</Tag> }]} />
  </>;
}
