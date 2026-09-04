import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Col, DatePicker, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { CheckOutlined, CloseOutlined, CopyOutlined, DeleteOutlined, FileAddOutlined, FolderOpenOutlined, LeftOutlined, PrinterOutlined, ReloadOutlined, RightOutlined, SaveOutlined, SearchOutlined, TableOutlined, UndoOutlined } from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { semiReceiptApi, type SRCreate, type SRDetail } from "../../api/semi";
import type { SemiFinishedLabelProductRow } from "../../api/semiFinishedLabelOrders";
import { productionApi } from "../../api/production";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { mergeSemiReceiptProducts, summarizeSemiReceiptLines, validateSemiReceipt, type SemiReceiptEditableLine } from "../../utils/semiReceiptOrder";
import SemiFinishedLabelProductPicker, { type SemiFinishedLabelProduct } from "../semi/SemiFinishedLabelProductPicker";
import SupplierPicker, { type SupplierRow } from "../plastics/SupplierPicker";
import SemiReceiptOrderPicker from "./SemiReceiptOrderPicker";

const MENU = "半成品入仓";
const currentUser = () => localStorage.getItem("erp_user") || "admin";
const blankLine = (key: number): SemiReceiptEditableLine => ({ key, 配件编号: "", 产品货号: "", 数量: 0, 单位: "PCS" });
const errorText = (error: unknown, fallback: string) => (error as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;

interface HeaderForm {
  供应商编号?: string; 供应商名称?: string; 日期?: Dayjs; 订单单号?: string; 单号?: string; 仓库?: string;
  备注?: string; 操作员?: string; 打印合并表格?: boolean;
}

export default function SemiReceiptPage() {
  const perms = usePerms();
  const navigate = useNavigate();
  const [form] = Form.useForm<HeaderForm>();
  const [lines, setLines] = useState<SemiReceiptEditableLine[]>([blankLine(1)]);
  const [opened, setOpened] = useState<SRDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const audited = opened?.单头?.审核 === "1";
  const canSave = can(perms, MENU, "保存");
  const readOnly = audited || !canSave || busy;

  const reset = () => {
    form.setFieldsValue({ 供应商编号: "", 供应商名称: "", 日期: dayjs(), 订单单号: "", 单号: "", 仓库: "半成品仓", 备注: "", 操作员: currentUser(), 打印合并表格: true });
    setLines([blankLine(1)]); setOpened(null);
  };

  const applyDetail = (detail: SRDetail) => {
    const head = detail.单头;
    form.setFieldsValue({
      供应商编号: head?.供应商编号 ?? "", 供应商名称: head?.供应商名称 ?? "", 日期: head?.日期 ? dayjs(head.日期) : dayjs(),
      订单单号: head?.订单单号 ?? "", 单号: head?.单号 ?? "", 仓库: head?.仓库 ?? "半成品仓", 备注: head?.备注 ?? "", 操作员: head?.操作员 ?? currentUser(),
    });
    const loaded = (detail.明细 ?? []).map((line, index) => ({ key: index + 1, 订单单号: line.订单单号 ?? "", 配件编号: line.配件编号 ?? line.物料编号 ?? "", 客户: line.客户 ?? "", 产品货号: line.产品货号 ?? "", 产品名称: line.产品名称 ?? "", 产品装配名称: line.产品装配名称 ?? line.物料名称 ?? "", 生产单号: line.生产单号 ?? "", 单位: line.单位 ?? "PCS", 数量: Number(line.数量 ?? 0), 单价: line.单价 ?? 0, 备注: line.备注 ?? "" }));
    setLines([...loaded, blankLine(loaded.length + 1)]); setOpened(detail);
  };

  const openDocument = async (documentNo: string) => {
    setBusy(true);
    try { applyDetail(await semiReceiptApi.get(documentNo)); }
    catch (error) { message.error(errorText(error, "打开半成品入仓单失败")); }
    finally { setBusy(false); }
  };

  // 从入仓查询双击跳入：URL ?open=<单号> 自动打开单据（仅首次）
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    const no = searchParams.get("open");
    if (no && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      void openDocument(no);
      setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("open"); return n; }, { replace: true });
    }
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // 从「查询生产单」跳入：URL ?mo=<生产单号> 新建单并把生产单号带入首行明细（页面被 keep-alive 缓存,用 ref 记已处理值保证重复跳入也生效）
  const moRef = useRef<string | null>(null);
  useEffect(() => {
    const mo = searchParams.get("mo");
    if (!mo) { moRef.current = null; return; }
    if (moRef.current === mo) return;
    moRef.current = mo;
    if (!opened?.单头?.单号) {
      (async () => {
        let po = "";
        let 客户 = "";
        let goods: { 货号?: string; 款号名称?: string; 数量?: number | null }[] = [];
        try {
          const d = await productionApi.get(mo);
          po = d.单头?.合同号 ?? "";
          客户 = d.单头?.客户名称 ?? "";
          goods = (d.货号明细 ?? []).filter(g => g.货号);
        } catch { /* 生产单不存在则只带生产单号 */ }
        if (po) form.setFieldsValue({ 订单单号: po });   // 订单单号=客户PO号(生产制单.合同号)
        if (goods.length === 0) {
          setLines([{ ...blankLine(1), 订单单号: po, 生产单号: mo }]);
          message.info(`已带入生产单号 ${mo}，请完善明细后保存`);
          return;
        }
        // 按货号精确查半成品标签产品,带出 配件编号/客户/产品名称/产品装配名称
        const newLines: SemiReceiptEditableLine[] = [];
        for (const g of goods) {
          let products: SemiFinishedLabelProductRow[] = [];
          try { products = (await semiReceiptApi.products({ field: "产品货号", keyword: g.货号, exact: true, page: 1, size: 50 })).items; } catch { /* 查不到则只带货号 */ }
          if (products.length > 0)
            for (const p of products)
              newLines.push({ key: newLines.length + 1, 订单单号: po, 配件编号: p.配件编号 ?? "", 客户: p.客户 ?? 客户, 产品货号: p.产品货号 ?? g.货号 ?? "", 产品名称: p.产品名称 ?? g.款号名称 ?? "", 产品装配名称: p.产品装配名称 ?? "", 生产单号: mo, 数量: Number(g.数量 ?? 0), 单位: "PCS" });
          else
            newLines.push({ key: newLines.length + 1, 订单单号: po, 配件编号: "", 客户, 产品货号: g.货号 ?? "", 产品名称: g.款号名称 ?? "", 生产单号: mo, 数量: Number(g.数量 ?? 0), 单位: "PCS" });
        }
        setLines([...newLines, blankLine(newLines.length + 1)]);
        message.info(`已带入生产单号 ${mo} 的 ${newLines.length} 行明细，请核对数量后保存`);
      })();
    }
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("mo"); return n; }, { replace: true });
  }, [searchParams, setSearchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const payload = (): SRCreate | null => {
    const values = form.getFieldsValue();
    const actual = lines.filter(line => line.配件编号.trim() || line.产品货号.trim());
    const issue = validateSemiReceipt({ 供应商名称: values.供应商名称, 仓库: values.仓库, 明细: actual });
    if (issue) { message.error(issue); return null; }
    return { 日期: (values.日期 ?? dayjs()).format("YYYY-MM-DD"), 订单单号: values.订单单号?.trim(), 仓库: values.仓库 ?? "", 供应商编号: values.供应商编号?.trim(), 供应商名称: values.供应商名称?.trim(), 备注: values.备注?.trim(), 明细: actual.map(line => ({ ...line, 客户: line.客户 ?? "", 产品名称: line.产品名称 ?? "", 产品装配名称: line.产品装配名称 ?? "", 单价: line.单价 ?? 0, 物料编号: line.配件编号, 物料名称: line.产品装配名称 ?? "" })) };
  };

  const save = async () => {
    const body = payload(); if (!body || readOnly) return;
    setBusy(true);
    try {
      if (opened?.单头?.单号) applyDetail(await semiReceiptApi.update(opened.单头.单号, body));
      else { const created = await semiReceiptApi.create(body); applyDetail(await semiReceiptApi.get(created.单号)); }
      message.success("半成品入仓单已保存");
    } catch (error) { message.error(errorText(error, "保存半成品入仓单失败")); }
    finally { setBusy(false); }
  };

  const remove = async () => {
    const no = opened?.单头?.单号; if (!no) return;
    setBusy(true);
    try { await semiReceiptApi.remove(no); reset(); message.success("半成品入仓单已删除"); }
    catch (error) { message.error(errorText(error, "删除失败")); }
    finally { setBusy(false); }
  };

  const audit = async (reverse = false) => {
    const no = opened?.单头?.单号; if (!no) return;
    setBusy(true);
    try { reverse ? await semiReceiptApi.unapprove(no) : await semiReceiptApi.approve(no); applyDetail(await semiReceiptApi.get(no)); message.success(reverse ? "已反审核" : "已审核"); }
    catch (error) { message.error(errorText(error, reverse ? "反审核失败" : "审核失败")); }
    finally { setBusy(false); }
  };

  const adjacent = async (direction: "previous" | "next") => {
    const no = opened?.单头?.单号; if (!no) return;
    setBusy(true);
    try { const detail = await semiReceiptApi.adjacent(no, direction); if (detail) applyDetail(detail); else message.info(direction === "previous" ? "已经是第一张单据" : "已经是最后一张单据"); }
    catch { message.error("切换相邻单据失败"); } finally { setBusy(false); }
  };

  const copy = () => { setOpened(null); form.setFieldsValue({ 单号: "", 日期: dayjs(), 操作员: currentUser() }); setLines(current => current.map((line, index) => ({ ...line, key: index + 1 }))); message.success("已复制为新单"); };
  const updateLine = (key: number, patch: Partial<SemiReceiptEditableLine>) => setLines(current => current.map(line => line.key === key ? { ...line, ...patch } : line));
  const removeLine = (key: number) => setLines(current => { const next = current.filter(line => line.key !== key).map((line, index) => ({ ...line, key: index + 1 })); return next.length ? next : [blankLine(1)]; });
  const pickProducts = (products: SemiFinishedLabelProduct[]) => setLines(current => { const actual = current.filter(line => line.配件编号.trim()); const merged = mergeSemiReceiptProducts(actual, products); return [...merged, blankLine(merged.length + 1)]; });
  const pickSupplier = (row: SupplierRow) => form.setFieldsValue({ 供应商编号: row.供应商编号 ?? "", 供应商名称: row.供应商名称 ?? "" });
  const summary = useMemo(() => summarizeSemiReceiptLines(lines), [lines]);
  const totals = useMemo(() => lines.reduce((value, line) => ({ qty: value.qty + Number(line.数量 || 0), amount: value.amount + Number(line.数量 || 0) * Number(line.单价 || 0) }), { qty: 0, amount: 0 }), [lines]);

  const columns: ColumnsType<SemiReceiptEditableLine> = [
    { title: "删除", width: 58, fixed: "left", render: (_, row) => <Button type="text" danger icon={<DeleteOutlined />} disabled={readOnly} onClick={() => removeLine(row.key)} aria-label="删除明细" /> },
    { title: "订单单号", dataIndex: "订单单号", width: 145, render: (_, row) => <Input value={row.订单单号 ?? ""} disabled={readOnly} onChange={e => updateLine(row.key, { 订单单号: e.target.value })} /> },
    { title: "配件编号", dataIndex: "配件编号", width: 135, render: (_, row) => <Input value={row.配件编号} readOnly disabled={readOnly} suffix={<SearchOutlined />} onClick={() => !readOnly && setProductOpen(true)} /> },
    { title: "客户", dataIndex: "客户", width: 120 }, { title: "产品货号", dataIndex: "产品货号", width: 140 }, { title: "产品名称", dataIndex: "产品名称", width: 170 },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 190 },
    { title: "生产单号", dataIndex: "生产单号", width: 145, render: (_, row) => <Input value={row.生产单号 ?? ""} disabled={readOnly} onChange={e => updateLine(row.key, { 生产单号: e.target.value })} /> },
    { title: "数量", dataIndex: "数量", width: 110, align: "right", render: (_, row) => <InputNumber min={0} value={row.数量} disabled={readOnly} onChange={value => updateLine(row.key, { 数量: Number(value ?? 0) })} style={{ width: "100%" }} /> },
    { title: "备注", dataIndex: "备注", width: 160, render: (_, row) => <Input value={row.备注 ?? ""} disabled={readOnly} onChange={e => updateLine(row.key, { 备注: e.target.value })} /> },
  ];

  return <Card title="半成品入仓单" extra={<Space wrap>
    <Button icon={<FileAddOutlined />} onClick={reset} disabled={busy}>新建</Button><Button icon={<FolderOpenOutlined />} onClick={() => setOrderOpen(true)} disabled={busy}>打开</Button>
    <Button type="primary" icon={<SaveOutlined />} onClick={() => void save()} disabled={readOnly} loading={busy}>保存</Button>
    <Popconfirm title="确认删除当前单据？" onConfirm={() => void remove()}><Button danger icon={<DeleteOutlined />} disabled={!opened?.单头?.单号 || audited || busy}>删除</Button></Popconfirm>
    <Button icon={<CopyOutlined />} onClick={copy} disabled={!opened || busy}>复制单</Button><Button icon={<ReloadOutlined />} onClick={() => opened?.单头?.单号 && void openDocument(opened.单头.单号)} disabled={!opened || busy}>刷新</Button>
    <Button icon={<LeftOutlined />} onClick={() => void adjacent("previous")} disabled={!opened || busy}>前单</Button><Button icon={<RightOutlined />} onClick={() => void adjacent("next")} disabled={!opened || busy}>后单</Button>
    <Button icon={<CheckOutlined />} onClick={() => void audit()} disabled={!opened || audited || busy}>审核</Button><Button icon={<UndoOutlined />} onClick={() => void audit(true)} disabled={!opened || !audited || busy}>反审核</Button>
    <Button icon={<TableOutlined />} disabled>表格设置</Button><Button icon={<PrinterOutlined />} onClick={() => window.print()}>打印</Button><Button danger icon={<CloseOutlined />} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
  </Space>}>
    <Form form={form} layout="vertical" size="small" initialValues={{ 日期: dayjs(), 仓库: "半成品仓", 操作员: currentUser(), 打印合并表格: true }}>
      <Row gutter={12}>
        <Col xs={24} md={8} xl={5}><Form.Item label="供应商" required><Space.Compact style={{ width: "100%" }}><Form.Item name="供应商名称" noStyle><Input readOnly placeholder="请选择供应商" /></Form.Item><Button icon={<SearchOutlined />} onClick={() => setSupplierOpen(true)} disabled={readOnly} /></Space.Compact><Form.Item name="供应商编号" hidden><Input /></Form.Item></Form.Item></Col>
        <Col xs={12} md={6} xl={4}><Form.Item label="日期" name="日期"><DatePicker disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="订单单号" name="订单单号"><Input disabled={readOnly} /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="电脑单号" name="单号"><Input readOnly placeholder="保存后生成" /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="收货仓库" name="仓库"><Select disabled={readOnly} options={[{ value: "半成品仓", label: "半成品仓" }, { value: "成品仓", label: "成品仓" }]} /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="操作员" name="操作员"><Input readOnly /></Form.Item></Col>
        <Col xs={12} md={6} xl={3}><Form.Item label="审核状态"><Tag color={audited ? "success" : "default"}>{audited ? "已审核" : "未审核"}</Tag></Form.Item></Col>
        <Col xs={24} md={12} xl={8}><Form.Item label="备注" name="备注"><Input disabled={readOnly} /></Form.Item></Col>
        <Col xs={24} md={12} xl={8}><Form.Item label="入库单号"><Input readOnly placeholder="保存后生成" value={opened?.单头?.单号 ?? ""} /></Form.Item></Col>
        <Col xs={24} md={12} xl={8}><Form.Item label="打印选项" name="打印合并表格" valuePropName="checked"><Checkbox disabled={readOnly}>打印合并表格</Checkbox></Form.Item></Col>
      </Row>
    </Form>
    <Row gutter={12}>
      <Col xs={24} xl={17}><Table rowKey="key" size="small" pagination={false} dataSource={lines} columns={columns} scroll={{ x: 1450, y: "calc(100vh - 470px)" }} /></Col>
      <Col xs={24} xl={7}><Table rowKey="key" size="small" pagination={false} dataSource={summary} columns={[{ title: "序号", dataIndex: "序号", width: 60 }, { title: "配件编号", dataIndex: "配件编号", width: 120 }, { title: "产品装配名称", dataIndex: "产品装配名称", width: 180 }, { title: "入仓数量", dataIndex: "入仓数量", width: 110, align: "right" }]} scroll={{ x: 470, y: "calc(100vh - 470px)" }} /></Col>
    </Row>
    <Space size={42} style={{ marginTop: 14 }} wrap><Statistic title="数量" value={totals.qty} /><Statistic title="金额" value={totals.amount} precision={2} /><Button onClick={() => setLines(current => { const actual = current.filter(line => line.配件编号.trim()); return [...actual, blankLine(actual.length + 1)]; })}>删除空白行</Button></Space>
    <SemiFinishedLabelProductPicker open={productOpen} onPick={pickProducts} onClose={() => setProductOpen(false)} loadProducts={semiReceiptApi.products} permissionMenu={MENU} />
    <SupplierPicker open={supplierOpen} onPick={pickSupplier} onClose={() => setSupplierOpen(false)} withAssembly />
    <SemiReceiptOrderPicker open={orderOpen} onPick={no => { setOrderOpen(false); void openDocument(no); }} onClose={() => setOrderOpen(false)} />
  </Card>;
}
