import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
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
  UndoOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  materialLabelOrdersApi,
  type MaterialLabelMaterialRow,
  type MaterialLabelOrderListRow,
} from "../../api/materialLabelOrders";
import { printTable } from "../../utils/tableExport";

const MENU = "来料标签单";
const PRINT_ROW_LIMIT = 2000;

interface LabelLine {
  ID?: number | null;
  key: number;
  序号?: number;
  物料编号: string;
  物料名称?: string | null;
  规格?: string | null;
  颜色?: string | null;
  单位?: string | null;
  数量: number;
  标签数: number;
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
  物料编号: "",
  数量: 0,
  标签数: 1,
  备注: "",
});
const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;

// 物料选择弹窗：查 /material-label-orders/materials，点行返回该物料
function MaterialPickModal({ open, onPick, onClose }: {
  open: boolean;
  onPick: (row: MaterialLabelMaterialRow) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<MaterialLabelMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await materialLabelOrdersApi.materials({ page: p, size: 50, keyword: keyword.trim() || undefined });
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载物料列表失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setPage(1); load(1); } }, [open]);
  useEffect(() => { if (!open) { setKeyword(""); setPage(1); setRows([]); } }, [open]);

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 130 },
    { title: "物料名称", dataIndex: "物料名称", width: 160 },
    { title: "规格", dataIndex: "规格", width: 120 },
    { title: "颜色", dataIndex: "颜色", width: 90 },
    { title: "单位", dataIndex: "单位", width: 70 },
  ];

  return (
    <Modal title="选择物料" open={open} onCancel={onClose} footer={null} width={860}>
      <div style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="物料编号/名称/规格/颜色" allowClear style={{ width: 280 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => { setPage(1); load(1); }}
        />
      </div>
      <Table
        size="small" rowKey="物料编号" loading={loading} dataSource={rows} columns={columns} scroll={{ x: true, y: 380 }}
        pagination={{ current: page, pageSize: 50, total, showSizeChanger: false,
          onChange: p => { setPage(p); load(p); }, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onClick: () => { onPick(r); onClose(); }, style: { cursor: "pointer" } })}
      />
    </Modal>
  );
}

// 单据选择弹窗：查 /material-label-orders 列表，点行返回电脑单号
function OrderPickModal({ open, onPick, onClose }: {
  open: boolean;
  onPick: (documentNo: string) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<MaterialLabelOrderListRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await materialLabelOrdersApi.list(p, 50, keyword.trim());
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载来料标签单列表失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setPage(1); load(1); } }, [open]);
  useEffect(() => { if (!open) { setKeyword(""); setPage(1); setRows([]); } }, [open]);

  const columns = [
    { title: "电脑单号", dataIndex: "电脑单号", width: 150 },
    { title: "日期", dataIndex: "日期", width: 110, render: (v: string) => v?.slice(0, 10) ?? "" },
    { title: "操作员", dataIndex: "操作员", width: 100 },
    { title: "审核", dataIndex: "审核", width: 80, render: (v: string) => v === "1" ? "已审核" : "未审核" },
    { title: "备注一", dataIndex: "备注一", width: 160 },
  ];

  return (
    <Modal title="打开来料标签单" open={open} onCancel={onClose} footer={null} width={860}>
      <div style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="电脑单号/操作员/备注" allowClear style={{ width: 280 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => { setPage(1); load(1); }}
        />
      </div>
      <Table
        size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns} scroll={{ x: true, y: 380 }}
        pagination={{ current: page, pageSize: 50, total, showSizeChanger: false,
          onChange: p => { setPage(p); load(p); }, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onClick: () => { onPick(r.电脑单号); onClose(); }, style: { cursor: "pointer" } })}
      />
    </Modal>
  );
}

export default function MaterialLabelOrderPage() {
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
  const [materialPickerOpen, setMaterialPickerOpen] = useState(false);
  const [orderPickerOpen, setOrderPickerOpen] = useState(false);
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
      const order = await materialLabelOrdersApi.get(orderNo) as unknown as LabelOrder;
      if (version !== documentRequestVersion.current) return;
      applyOrder(order);
    } catch (error) {
      if (version === documentRequestVersion.current) {
        message.error(errorMessage(error, "打开来料标签单失败"));
      }
    }
  }, [applyOrder, cancelAuditOperation, invalidateMutation]);

  // 从查询报表跳入：URL ?open=<电脑单号> 自动打开对应单据（仅首次）
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
    const printable = lines.filter(line => line.物料编号.trim());
    if (!printable.length) {
      message.error("至少需要一条明细");
      return null;
    }
    for (const [index, line] of printable.entries()) {
      if (!Number.isFinite(line.数量) || line.数量 < 0) {
        message.error(`第${index + 1}行：数量必须为有限的非负数`);
        return null;
      }
      if (!Number.isInteger(line.标签数) || line.标签数 < 0) {
        message.error(`第${index + 1}行：标签数必须为非负整数`);
        return null;
      }
    }
    return {
      日期: (values.日期 ?? dayjs()).format("YYYY-MM-DD"),
      备注一: values.备注一 ?? "",
      备注二: values.备注二 ?? "",
      明细: printable.map((line, index) => ({ ...line, 序号: index + 1 })),
    };
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
        const saved = await materialLabelOrdersApi.update(openedOrder.电脑单号, payload as never);
        if (mutation !== mutationVersion.current) return;
        applyOrder(saved as unknown as LabelOrder);
      } else {
        const saved = await materialLabelOrdersApi.create(payload as never);
        if (mutation !== mutationVersion.current) return;
        const version = ++documentRequestVersion.current;
        const created = await materialLabelOrdersApi.get(saved.电脑单号) as unknown as LabelOrder;
        if (mutation !== mutationVersion.current || version !== documentRequestVersion.current) return;
        applyOrder(created);
      }
      if (mutation === mutationVersion.current) message.success("来料标签单已保存");
    } catch (error) {
      message.error(errorMessage(error, "保存来料标签单失败"));
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
      await materialLabelOrdersApi.remove(openedOrder.电脑单号);
      if (mutation !== mutationVersion.current) return;
      message.success("来料标签单已删除");
      reset();
    } catch (error) {
      if (mutation === mutationVersion.current) {
        message.error(errorMessage(error, "删除来料标签单失败"));
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
      const order = await materialLabelOrdersApi.adjacent(openedOrder.电脑单号, direction) as unknown as LabelOrder | null;
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
      if (reverse) await materialLabelOrdersApi.reverseAudit(orderNo);
      else await materialLabelOrdersApi.audit(orderNo);
      if (version !== documentRequestVersion.current) return;
      const order = await materialLabelOrdersApi.get(orderNo) as unknown as LabelOrder;
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

  const updateLine = (key: number, patch: Partial<LabelLine>) => {
    if (editReadOnly || writeActive.current || auditActive.current) return;
    invalidateMutation();
    setLines(current => current.map(line => line.key === key ? { ...line, ...patch, key: line.key } : line));
  };

  const pickMaterial = (material: MaterialLabelMaterialRow) => {
    if (editReadOnly || writeActive.current || auditActive.current) return;
    invalidateMutation();
    setLines(current => {
      const code = material.物料编号.trim();
      if (current.some(line => line.物料编号.trim().toLocaleLowerCase() === code.toLocaleLowerCase())) {
        message.warning(`物料 [${code}] 已在明细中`);
        return current;
      }
      const newLine: LabelLine = {
        ...makeBlankLine(0),
        物料编号: code,
        物料名称: material.物料名称,
        规格: material.规格,
        颜色: material.颜色,
        单位: material.单位,
      };
      const existing = current.filter(line => line.物料编号.trim());
      const merged = [...existing, newLine].map((line, index) => ({ ...line, key: index + 1, 序号: index + 1 }));
      return [...merged, makeBlankLine(merged.length + 1)];
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

  const print = () => {
    const printable = lines.filter(line => line.物料编号.trim());
    if (!printable.length) { message.error("没有可打印的明细"); return; }
    const totalLabels = printable.reduce((sum, line) => sum + (Number.isInteger(line.标签数) ? line.标签数 : 0), 0);
    if (totalLabels <= 0) { message.error("标签数合计为 0，无法打印"); return; }
    if (totalLabels > PRINT_ROW_LIMIT) { message.error(`标签数合计 ${totalLabels} 超过 ${PRINT_ROW_LIMIT}，请分批打印`); return; }
    const rows: Record<string, unknown>[] = [];
    let sequence = 0;
    for (const line of printable) {
      for (let index = 1; index <= line.标签数; index++) {
        rows.push({
          序号: ++sequence,
          物料编号: line.物料编号,
          物料名称: line.物料名称 ?? "",
          规格: line.规格 ?? "",
          颜色: line.颜色 ?? "",
          单位: line.单位 ?? "",
          数量: line.数量,
          标签序号: `${index}/${line.标签数}`,
        });
      }
    }
    const documentNo = openedOrder?.电脑单号 ?? "未保存";
    printTable(`来料标签单 ${documentNo}`, [
      { title: "序号", key: "序号" },
      { title: "物料编号", key: "物料编号" },
      { title: "物料名称", key: "物料名称" },
      { title: "规格", key: "规格" },
      { title: "颜色", key: "颜色" },
      { title: "单位", key: "单位" },
      { title: "数量", key: "数量" },
      { title: "标签序号", key: "标签序号" },
    ], rows);
  };

  const totals = useMemo(() => lines.reduce((total, line) => ({
    数量: total.数量 + Number(line.数量 || 0),
    标签数: total.标签数 + Number(line.标签数 || 0),
  }), { 数量: 0, 标签数: 0 }), [lines]);

  const columns: ColumnsType<LabelLine> = [
    { title: "删除", key: "delete", width: 58, fixed: "left", render: (_value, row) => <Button type="text" danger icon={<DeleteOutlined />} disabled={editReadOnly} onClick={() => removeLine(row.key)} aria-label="删除明细行" /> },
    { title: "序号", dataIndex: "序号", width: 58, fixed: "left" },
    { title: "物料编号", dataIndex: "物料编号", width: 140, render: (_value, row) => <Input value={row.物料编号} disabled={editReadOnly} readOnly onClick={() => !editReadOnly && setMaterialPickerOpen(true)} /> },
    { title: "物料名称", dataIndex: "物料名称", width: 170, render: value => <Input value={value ?? ""} disabled={editReadOnly} readOnly /> },
    { title: "规格", dataIndex: "规格", width: 130, render: value => <Input value={value ?? ""} disabled={editReadOnly} readOnly /> },
    { title: "颜色", dataIndex: "颜色", width: 100, render: value => <Input value={value ?? ""} disabled={editReadOnly} readOnly /> },
    { title: "单位", dataIndex: "单位", width: 80, render: value => <Input value={value ?? ""} disabled={editReadOnly} readOnly /> },
    { title: "数量", dataIndex: "数量", width: 115, align: "right", render: (_value, row) => <InputNumber min={0} value={row.数量} disabled={editReadOnly} onChange={value => updateLine(row.key, { 数量: Number(value ?? 0) })} style={{ width: "100%" }} /> },
    { title: "标签数", dataIndex: "标签数", width: 110, align: "right", render: (_value, row) => <InputNumber min={0} precision={0} value={row.标签数} disabled={editReadOnly} onChange={value => updateLine(row.key, { 标签数: Number(value ?? 0) })} style={{ width: "100%" }} /> },
    { title: "备注", dataIndex: "备注", width: 200, render: (_value, row) => <Input value={row.备注 ?? ""} disabled={editReadOnly} onChange={event => updateLine(row.key, { 备注: event.target.value })} /> },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#8c8c8c" }}>无权访问该页面</div></Card>;
  }

  return (
    <Card title="来料标签单" variant="borderless" extra={
      <Space wrap>
        <Button icon={<FileAddOutlined />} disabled={!canSave || mutating} onClick={startNew}>新建</Button>
        <Button icon={<FolderOpenOutlined />} disabled={mutating} onClick={() => !writeActive.current && !auditActive.current && setOrderPickerOpen(true)}>打开</Button>
        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={readOnly || deleting || auditLoading !== null} onClick={save}>保存</Button>
        <Popconfirm title="确认删除该来料标签单?" disabled={!openedOrder?.电脑单号 || audited || !canDelete || auditLoading !== null || saving} onConfirm={remove}>
          <Button icon={<DeleteOutlined />} loading={deleting} disabled={!openedOrder?.电脑单号 || audited || !canDelete || auditLoading !== null || saving}>删除</Button>
        </Popconfirm>
        <Button icon={<CopyOutlined />} disabled={!openedOrder || !canSave || mutating} onClick={copy}>复制单</Button>
        <Button icon={<LeftOutlined />} disabled={!openedOrder?.电脑单号 || mutating} onClick={() => void moveAdjacent("previous")}>前单</Button>
        <Button icon={<RightOutlined />} disabled={!openedOrder?.电脑单号 || mutating} onClick={() => void moveAdjacent("next")}>后单</Button>
        <Button icon={<CheckOutlined />} loading={auditLoading === "audit"} disabled={!openedOrder?.电脑单号 || audited || !canAudit || mutating} onClick={() => void changeAudit()}>审核</Button>
        <Button icon={<UndoOutlined />} loading={auditLoading === "reverse"} disabled={!openedOrder?.电脑单号 || !audited || !canReverseAudit || mutating} onClick={() => void changeAudit(true)}>反审核</Button>
        <Button icon={<PrinterOutlined />} disabled={!canPrint || mutating} onClick={print}>打印标签</Button>
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
        dataSource={lines}
        columns={columns}
        scroll={{ x: 1300, y: "calc(100vh - 430px)" }}
      />
      <Space size={36} style={{ marginTop: 14 }} wrap>
        <Statistic title="数量合计" value={totals.数量} />
        <Statistic title="标签数合计" value={totals.标签数} />
      </Space>
      <MaterialPickModal open={materialPickerOpen} onPick={pickMaterial} onClose={() => setMaterialPickerOpen(false)} />
      <OrderPickModal open={orderPickerOpen} onPick={orderNo => { setOrderPickerOpen(false); void openOrder(orderNo); }} onClose={() => setOrderPickerOpen(false)} />
    </Card>
  );
}
