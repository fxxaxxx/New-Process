import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  LeftOutlined,
  PrinterOutlined,
  RightOutlined,
  SaveOutlined,
  TableOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { semiFinishedLabelOrdersApi } from "../../api/semiFinishedLabelOrders";
import {
  markActualLabelsEdited,
  mergeSelectedProducts,
  recalculateLine,
  validateLabelOrder,
  validateLabelOrderForPrint,
} from "../../utils/semiFinishedLabelOrders";
import SemiFinishedLabelOrderPicker from "./SemiFinishedLabelOrderPicker";
import SemiFinishedLabelProductPicker, { type SemiFinishedLabelProduct } from "./SemiFinishedLabelProductPicker";
import SemiFinishedLabelPrintPreview from "./SemiFinishedLabelPrintPreview";

const MENU = "半成品标签单";

interface LabelLine {
  ID?: number | null;
  key: number;
  序号?: number;
  配件编号: string;
  客户?: string | null;
  产品货号: string;
  产品名称?: string | null;
  产品装配名称?: string | null;
  数量: number;
  每箱数量?: number | null;
  预计标签数: number;
  实需标签数: number;
  实需标签数已手改: boolean;
  备注?: string | null;
}

interface LabelOrder {
  ID?: number;
  电脑单号?: string | null;
  日期?: string | null;
  备注一?: string | null;
  备注二?: string | null;
  操作员?: string | null;
  审核?: string | null;
  审核人?: string | null;
  审核时间?: string | null;
  明细?: Omit<LabelLine, "key">[] | null;
}

interface HeaderForm {
  电脑单号?: string;
  日期?: Dayjs;
  备注一?: string;
  备注二?: string;
  操作员?: string;
}

const currentUser = () => localStorage.getItem("erp_user") || "";
const makeBlankLine = (key: number): LabelLine => ({
  key,
  配件编号: "",
  产品货号: "",
  数量: 0,
  每箱数量: undefined,
  预计标签数: 0,
  实需标签数: 0,
  实需标签数已手改: false,
  备注: "",
});
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;

export default function SemiFinishedLabelOrderPage() {
  const perms = usePerms();
  const navigate = useNavigate();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const canDelete = can(perms, MENU, "删除");
  const canAudit = can(perms, MENU, "审核");
  const canReverseAudit = can(perms, MENU, "反审核");
  const canPrint = can(perms, MENU, "打印");
  const [form] = Form.useForm<HeaderForm>();
  const [lines, setLines] = useState<LabelLine[]>([makeBlankLine(1)]);
  const [openedOrder, setOpenedOrder] = useState<LabelOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [auditLoading, setAuditLoading] = useState<"audit" | "reverse" | null>(null);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printDocumentDate, setPrintDocumentDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [invalidLineKey, setInvalidLineKey] = useState<number | null>(null);
  const documentRequestVersion = useRef(0);
  const mutationVersion = useRef(0);
  const writeActive = useRef(false);
  const auditOperationVersion = useRef(0);
  const auditActive = useRef(false);

  const audited = openedOrder?.审核 === "1";
  const readOnly = !canSave || audited;
  const mutating = saving || deleting || auditLoading !== null;
  const editReadOnly = readOnly || mutating;

  const invalidateMutation = useCallback(() => {
    mutationVersion.current += 1;
  }, []);

  const cancelAuditOperation = useCallback(() => {
    auditOperationVersion.current += 1;
    auditActive.current = false;
    setAuditLoading(null);
  }, []);

  const reset = useCallback(() => {
    documentRequestVersion.current += 1;
    invalidateMutation();
    cancelAuditOperation();
    form.resetFields();
    form.setFieldsValue({ 日期: dayjs(), 操作员: currentUser(), 电脑单号: undefined, 备注一: "", 备注二: "" });
    setLines([makeBlankLine(1)]);
    setOpenedOrder(null);
  }, [cancelAuditOperation, form, invalidateMutation]);

  const startNew = useCallback(() => {
    if (writeActive.current || auditActive.current) return;
    reset();
  }, [reset]);

  const applyOrder = useCallback((order: LabelOrder) => {
    form.setFieldsValue({
      电脑单号: order.电脑单号 ?? undefined,
      日期: order.日期 ? dayjs(order.日期) : dayjs(),
      备注一: order.备注一 ?? "",
      备注二: order.备注二 ?? "",
      操作员: order.操作员 ?? currentUser(),
    });
    const loaded = (order.明细 ?? []).map((line, index) => ({ ...makeBlankLine(index + 1), ...line, key: index + 1, 序号: index + 1 }));
    setLines(loaded.length ? loaded : [makeBlankLine(1)]);
    setOpenedOrder(order);
  }, [form]);

  const openOrder = useCallback(async (orderNo: string) => {
    if (writeActive.current || auditActive.current) return;
    invalidateMutation();
    cancelAuditOperation();
    const version = ++documentRequestVersion.current;
    try {
      const order = await semiFinishedLabelOrdersApi.get(orderNo) as unknown as LabelOrder;
      if (version !== documentRequestVersion.current) return;
      applyOrder(order);
    } catch (error) {
      if (version === documentRequestVersion.current) {
        message.error(errorMessage(error, "打开半成品标签单失败"));
      }
    }
  }, [applyOrder, cancelAuditOperation, invalidateMutation]);

  // 从查询报表双击跳入：URL ?open=<电脑单号> 自动打开对应单据（仅首次）
  const [searchParams, setSearchParams] = useSearchParams();
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    const no = searchParams.get("open");
    if (no && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      void openOrder(no);
      setSearchParams(prev => { const n = new URLSearchParams(prev); n.delete("open"); return n; }, { replace: true });
    }
  }, [searchParams, openOrder, setSearchParams]);

  const buildPayload = useCallback(async () => {
    const values = await form.validateFields();
    const payload = {
      日期: (values.日期 ?? dayjs()).format("YYYY-MM-DD"),
      备注一: values.备注一 ?? "",
      备注二: values.备注二 ?? "",
      明细: lines.filter(line => line.配件编号.trim() || line.产品货号.trim()).map((line, index) => ({ ...line, 序号: index + 1 })),
    };
    const issues = validateLabelOrder(payload as never);
    if (issues.length) {
      message.error(issues[0]?.消息 ?? "请检查标签单明细");
      return null;
    }
    return payload;
  }, [form, lines]);

  const save = async () => {
    if (readOnly || !canSave || auditActive.current || writeActive.current) return;
    writeActive.current = true;
    setSaving(true);
    let payload: Awaited<ReturnType<typeof buildPayload>>;
    try {
      try { payload = await buildPayload(); } catch { return; }
      if (!payload) return;
      const mutation = ++mutationVersion.current;
      if (openedOrder?.电脑单号) {
        const saved = await semiFinishedLabelOrdersApi.update(openedOrder.电脑单号, payload as never);
        if (mutation !== mutationVersion.current) return;
        applyOrder(saved as unknown as LabelOrder);
      } else {
        const saved = await semiFinishedLabelOrdersApi.create(payload as never);
        if (mutation !== mutationVersion.current) return;
        const version = ++documentRequestVersion.current;
        const created = await semiFinishedLabelOrdersApi.get(saved.电脑单号) as unknown as LabelOrder;
        if (mutation !== mutationVersion.current || version !== documentRequestVersion.current) return;
        applyOrder(created);
      }
      if (mutation === mutationVersion.current) message.success("半成品标签单已保存");
    } catch (error) {
      message.error(errorMessage(error, "保存半成品标签单失败"));
    } finally {
      writeActive.current = false;
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!openedOrder?.电脑单号 || audited || !canDelete || auditActive.current || writeActive.current) return;
    writeActive.current = true;
    const mutation = ++mutationVersion.current;
    setDeleting(true);
    try {
      await semiFinishedLabelOrdersApi.remove(openedOrder.电脑单号);
      if (mutation !== mutationVersion.current) return;
      message.success("半成品标签单已删除");
      reset();
    } catch (error) {
      if (mutation === mutationVersion.current) {
        message.error(errorMessage(error, "删除半成品标签单失败"));
      }
    } finally {
      writeActive.current = false;
      setDeleting(false);
    }
  };

  const copy = () => {
    if (!openedOrder || !canSave || writeActive.current || auditActive.current) return;
    documentRequestVersion.current += 1;
    invalidateMutation();
    cancelAuditOperation();
    form.setFieldsValue({ 电脑单号: undefined, 操作员: currentUser() });
    setOpenedOrder(null);
    setLines(current => current.map((line, index) => ({ ...line, ID: undefined, key: index + 1, 序号: index + 1 })));
    message.success("已复制为未保存新单");
  };

  const moveAdjacent = async (direction: "previous" | "next") => {
    if (!openedOrder?.电脑单号 || writeActive.current || auditActive.current) return;
    invalidateMutation();
    cancelAuditOperation();
    const version = ++documentRequestVersion.current;
    try {
      const order = await semiFinishedLabelOrdersApi.adjacent(openedOrder.电脑单号, direction) as unknown as LabelOrder | null;
      if (version !== documentRequestVersion.current) return;
      if (!order) { message.info(direction === "previous" ? "已经是第一张单据" : "已经是最后一张单据"); return; }
      applyOrder(order);
    } catch (error) {
      if (version === documentRequestVersion.current) {
        message.error(errorMessage(error, "切换相邻单据失败"));
      }
    }
  };

  const changeAudit = async (reverse = false) => {
    if (!openedOrder?.电脑单号 || auditActive.current || writeActive.current) return;
    const orderNo = openedOrder.电脑单号;
    writeActive.current = true;
    invalidateMutation();
    auditActive.current = true;
    const auditOperation = ++auditOperationVersion.current;
    setAuditLoading(reverse ? "reverse" : "audit");
    const version = ++documentRequestVersion.current;
    try {
      if (reverse) await semiFinishedLabelOrdersApi.reverseAudit(orderNo);
      else await semiFinishedLabelOrdersApi.audit(orderNo);
      if (version !== documentRequestVersion.current) return;
      const order = await semiFinishedLabelOrdersApi.get(orderNo) as unknown as LabelOrder;
      if (version !== documentRequestVersion.current) return;
      applyOrder(order);
      message.success(reverse ? "已反审核" : "已审核");
    } catch (error) {
      if (version === documentRequestVersion.current) {
        message.error(errorMessage(error, reverse ? "反审核失败" : "审核失败"));
      }
    } finally {
      if (auditOperation === auditOperationVersion.current) {
        auditActive.current = false;
        writeActive.current = false;
        setAuditLoading(null);
      }
    }
  };

  const updateLine = (key: number, patch: Partial<LabelLine>, recalculate = false) => {
    if (editReadOnly || writeActive.current || auditActive.current) return;
    invalidateMutation();
    setLines(current => current.map(line => {
      if (line.key !== key) return line;
      const next = recalculate ? recalculateLine(line as never, patch as never) : { ...line, ...patch };
      return { ...next, key: line.key } as LabelLine;
    }));
  };

  const pickProducts = (products: SemiFinishedLabelProduct[]) => {
    if (editReadOnly || writeActive.current || auditActive.current) return;
    invalidateMutation();
    setLines(current => {
      const existing = current.filter(line => line.配件编号.trim());
      const merged = mergeSelectedProducts(existing as never, products as never) as unknown as Omit<LabelLine, "key">[];
      return [...merged.map((line, index) => ({ ...line, key: index + 1, 序号: index + 1 })), makeBlankLine(merged.length + 1)];
    });
  };

  const removeLine = (key: number) => {
    if (editReadOnly || writeActive.current || auditActive.current) return;
    invalidateMutation();
    setLines(current => {
      const next = current.filter(line => line.key !== key).map((line, index) => ({ ...line, key: index + 1, 序号: index + 1 }));
      return next.length ? next : [makeBlankLine(1)];
    });
  };

  const openPrintPreview = () => {
    const printableLines = lines.filter(line => line.配件编号.trim() || line.产品货号.trim());
    const issues = validateLabelOrderForPrint({ 明细: printableLines } as never);
    if (issues.length) {
      const firstIssue = issues[0];
      const lineIndex = Number(firstIssue?.字段.match(/^明细\[(\d+)\]/)?.[1] ?? -1);
      const line = lineIndex >= 0 ? printableLines[lineIndex] : undefined;
      setInvalidLineKey(line?.key ?? null);
      message.error(`${line ? `第${lineIndex + 1}行：` : ""}${firstIssue?.消息 ?? "请检查标签单明细"}`);
      return;
    }
    setInvalidLineKey(null);
    const formDate = form.getFieldValue("日期");
    setPrintDocumentDate(formDate?.format?.("YYYY-MM-DD") ?? dayjs().format("YYYY-MM-DD"));
    setPrintPreviewOpen(true);
  };

  const totals = useMemo(() => lines.reduce((total, line) => ({
    数量: total.数量 + Number(line.数量 || 0),
    预计标签数: total.预计标签数 + Number(line.预计标签数 || 0),
    实需标签数: total.实需标签数 + Number(line.实需标签数 || 0),
  }), { 数量: 0, 预计标签数: 0, 实需标签数: 0 }), [lines]);

  const columns: ColumnsType<LabelLine> = [
    { title: "删除", key: "delete", width: 58, fixed: "left", render: (_value, row) => <Button type="text" danger icon={<DeleteOutlined />} disabled={editReadOnly} onClick={() => removeLine(row.key)} aria-label="删除明细行" /> },
    { title: "序号", dataIndex: "序号", width: 58, fixed: "left" },
    { title: "配件编号", dataIndex: "配件编号", width: 130, render: (_value, row) => <Input value={row.配件编号} disabled={editReadOnly} readOnly onClick={() => !editReadOnly && setProductPickerOpen(true)} /> },
    { title: "客户", dataIndex: "客户", width: 130, render: value => <Input value={value ?? ""} disabled={editReadOnly} readOnly /> },
    { title: "产品货号", dataIndex: "产品货号", width: 140, render: (_value, row) => <Input value={row.产品货号} disabled={editReadOnly} onClick={() => !editReadOnly && setProductPickerOpen(true)} readOnly /> },
    { title: "产品名称", dataIndex: "产品名称", width: 170, render: value => <Input value={value ?? ""} disabled={editReadOnly} readOnly /> },
    { title: "产品装配名称", dataIndex: "产品装配名称", width: 190, render: value => <Input value={value ?? ""} disabled={editReadOnly} readOnly /> },
    { title: "数量", dataIndex: "数量", width: 115, align: "right", render: (_value, row) => <InputNumber min={0} value={row.数量} disabled={editReadOnly} onChange={value => updateLine(row.key, { 数量: Number(value ?? 0) }, true)} style={{ width: "100%" }} /> },
    { title: "每箱数量", dataIndex: "每箱数量", width: 115, align: "right", render: (_value, row) => <InputNumber min={0} value={row.每箱数量 ?? undefined} disabled={editReadOnly} onChange={value => updateLine(row.key, { 每箱数量: value == null ? undefined : Number(value) }, true)} style={{ width: "100%" }} /> },
    { title: "预计标签数", dataIndex: "预计标签数", width: 115, align: "right", render: value => <span className="erp-num">{value}</span> },
    { title: "实需标签数", dataIndex: "实需标签数", width: 125, align: "right", render: (_value, row) => <InputNumber min={0} precision={0} value={row.实需标签数} disabled={editReadOnly} onChange={value => updateLine(row.key, markActualLabelsEdited(row as never, Number(value ?? 0)) as unknown as Partial<LabelLine>)} style={{ width: "100%" }} /> },
    { title: "备注", dataIndex: "备注", width: 200, render: (_value, row) => <Input value={row.备注 ?? ""} disabled={editReadOnly} onChange={event => updateLine(row.key, { 备注: event.target.value })} /> },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  }

  return (
    <Card title="半成品标签单" variant="borderless" extra={
      <Space wrap>
        <Button icon={<FileAddOutlined />} disabled={!canSave || mutating} onClick={startNew}>新建</Button>
        <Button icon={<FolderOpenOutlined />} disabled={mutating} onClick={() => !writeActive.current && !auditActive.current && setOrderPickerOpen(true)}>打开</Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={readOnly || deleting || auditLoading !== null} onClick={save}>保存</Button>
        <Popconfirm title="确认删除该半成品标签单?" disabled={!openedOrder?.电脑单号 || audited || !canDelete || auditLoading !== null || saving} onConfirm={remove}>
          <Button icon={<DeleteOutlined />} loading={deleting} disabled={!openedOrder?.电脑单号 || audited || !canDelete || auditLoading !== null || saving}>删除</Button>
        </Popconfirm>
        <Button icon={<CopyOutlined />} disabled={!openedOrder || !canSave || mutating} onClick={copy}>复制单</Button>
        <Button icon={<LeftOutlined />} disabled={!openedOrder?.电脑单号 || mutating} onClick={() => void moveAdjacent("previous")}>前单</Button>
        <Button icon={<RightOutlined />} disabled={!openedOrder?.电脑单号 || mutating} onClick={() => void moveAdjacent("next")}>后单</Button>
        <Button icon={<CheckOutlined />} loading={auditLoading === "audit"} disabled={!openedOrder?.电脑单号 || audited || !canAudit || mutating} onClick={() => void changeAudit()}>审核</Button>
        <Button icon={<UndoOutlined />} loading={auditLoading === "reverse"} disabled={!openedOrder?.电脑单号 || !audited || !canReverseAudit || mutating} onClick={() => void changeAudit(true)}>反审核</Button>
        <Button icon={<TableOutlined />} disabled>表格设置</Button>
        <Button icon={<PrinterOutlined />} disabled={!canPrint} onClick={openPrintPreview}>打印</Button>
        <Button disabled={!canPrint} onClick={openPrintPreview}>标识贴</Button>
        <Button danger icon={<CloseOutlined />} disabled={mutating} onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}>关闭</Button>
      </Space>
    }>
      <Form form={form} layout="vertical" size="small" initialValues={{ 日期: dayjs(), 操作员: currentUser() }} onValuesChange={() => { if (!writeActive.current && !auditActive.current) invalidateMutation(); }}>
        <Row gutter={12}>
          <Col xs={24} sm={12} lg={5}><Form.Item label="电脑单号" name="电脑单号"><Input readOnly placeholder="保存后自动生成" /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item label="日期" name="日期"><DatePicker disabled={editReadOnly} style={{ width: "100%" }} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item label="操作员" name="操作员"><Input readOnly /></Form.Item></Col>
          <Col xs={24} sm={12} lg={4}><Form.Item label="审核状态"><Tag color={audited ? "success" : "default"}>{audited ? "已审核" : "未审核"}</Tag></Form.Item></Col>
          <Col xs={24} sm={12} lg={7}><Form.Item label="备注一" name="备注一"><Input disabled={editReadOnly} /></Form.Item></Col>
          <Col xs={24} sm={12} lg={7}><Form.Item label="备注二" name="备注二"><Input disabled={editReadOnly} /></Form.Item></Col>
        </Row>
      </Form>
      <Table<LabelLine>
        rowKey="key"
        size="small"
        pagination={false}
        rowClassName={row => row.key === invalidLineKey ? "erp-row-error" : ""}
        dataSource={lines}
        columns={columns}
        scroll={{ x: 1450, y: "calc(100vh - 430px)" }}
      />
      <Space size={36} style={{ marginTop: 14 }} wrap>
        <Statistic title="数量合计" value={totals.数量} />
        <Statistic title="预计标签数合计" value={totals.预计标签数} />
        <Statistic title="实需标签数合计" value={totals.实需标签数} />
      </Space>
      <SemiFinishedLabelProductPicker open={productPickerOpen} onPick={pickProducts} onClose={() => setProductPickerOpen(false)} />
      <SemiFinishedLabelOrderPicker open={orderPickerOpen} onPick={orderNo => { setOrderPickerOpen(false); void openOrder(orderNo); }} onClose={() => setOrderPickerOpen(false)} />
      <SemiFinishedLabelPrintPreview
        open={printPreviewOpen}
        documentNo={openedOrder?.电脑单号 ?? undefined}
        documentDate={printDocumentDate}
        lines={lines.filter(line => line.配件编号.trim() || line.产品货号.trim())}
        onClose={() => setPrintPreviewOpen(false)}
      />
    </Card>
  );
}
