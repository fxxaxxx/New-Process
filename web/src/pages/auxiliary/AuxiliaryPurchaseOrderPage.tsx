import { useCallback, useMemo, useState, type Key } from "react";
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
  Select,
  Space,
  Table,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  FileAddOutlined,
  FolderOpenOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  TableOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { materialMasterApi, type MaterialRow } from "../../api/materialMaster";
import { masterApi } from "../../api/master";
import { purchaseOrderApi, type PurchaseOrderHeader, type PurchaseOrderLine } from "../../api/purchaseOrders";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  applyAuxiliaryMaterialToLine,
  AUXILIARY_PURCHASE_ORDER_CATEGORY,
  buildAuxiliaryPurchasePayload,
  createAuxiliaryPurchaseLines,
  summarizeAuxiliaryPurchaseLines,
  type AuxiliaryPurchaseLine,
} from "../../utils/auxiliaryPurchaseOrder";

const API_MENU = "采购订单";
const currentUser = () => localStorage.getItem("erp_user") || "admin";
const fmtDate = (value?: string | null) => (value ? String(value).slice(0, 10) : "");
const money = (value: number) => value.toFixed(2);
const supplierApi = masterApi("suppliers");

interface SupplierRow {
  ID?: number;
  供应商编号?: string;
  供应商名称?: string;
  供应商类别?: string;
  联系人?: string;
  手机?: string;
  货币?: string;
  备注?: string;
}

interface HeaderForm {
  供应商编号?: string;
  供应商名称?: string;
  日期?: Dayjs;
  交货日期?: Dayjs;
  电脑单号?: string;
  备注?: string;
  操作员?: string;
  单价类型?: string;
}

const nextLine = (lines: AuxiliaryPurchaseLine[]): AuxiliaryPurchaseLine => {
  const maxKey = lines.reduce((max, line) => Math.max(max, Number(line.key) || 0), 0);
  return { key: maxKey + 1, 序号: lines.length + 1, 数量: 0, 备注: "" };
};

const normalizeLineNo = (lines: AuxiliaryPurchaseLine[]) =>
  lines.map((line, index) => ({ ...line, 序号: index + 1 }));

const parseError = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;

export default function AuxiliaryPurchaseOrderPage() {
  const perms = usePerms();
  const canSave = can(perms, API_MENU, "保存");
  const canDelete = can(perms, API_MENU, "删除");
  const canApprove = can(perms, API_MENU, "审核");
  const canUnapprove = can(perms, API_MENU, "反审核");
  const [form] = Form.useForm<HeaderForm>();
  const [lines, setLines] = useState<AuxiliaryPurchaseLine[]>(() => createAuxiliaryPurchaseLines(20));
  const [openedNo, setOpenedNo] = useState<string | null>(null);
  const [openedAudit, setOpenedAudit] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierKeyword, setSupplierKeyword] = useState("");
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);

  const [materialOpen, setMaterialOpen] = useState(false);
  const [activeLineKey, setActiveLineKey] = useState<number | null>(null);
  const [materialKeyword, setMaterialKeyword] = useState("");
  const [materialSearchField, setMaterialSearchField] = useState("辅料名称");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [selectedMaterialKeys, setSelectedMaterialKeys] = useState<Key[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialRow[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [orders, setOrders] = useState<PurchaseOrderHeader[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({
      日期: dayjs(),
      交货日期: dayjs(),
      操作员: currentUser(),
      单价类型: "人民币",
    });
    setLines(createAuxiliaryPurchaseLines(20));
    setOpenedNo(null);
    setOpenedAudit(undefined);
  }, [form]);

  const summary = useMemo(() => summarizeAuxiliaryPurchaseLines(lines), [lines]);

  const patchLine = (key: number, patch: Partial<AuxiliaryPurchaseLine>) => {
    setLines(prev => prev.map(line => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: number) => {
    setLines(prev => {
      const next = normalizeLineNo(prev.filter(line => line.key !== key));
      return next.length ? next : createAuxiliaryPurchaseLines(1);
    });
  };

  const loadMaterials = useCallback(async () => {
    setMaterialLoading(true);
    try {
      const result = await materialMasterApi.list(
        AUXILIARY_PURCHASE_ORDER_CATEGORY,
        materialKeyword.trim(),
        1,
        300,
      );
      setMaterials(result.items);
    } catch {
      message.error("加载辅料资料失败");
    } finally {
      setMaterialLoading(false);
    }
  }, [materialKeyword]);

  const openMaterialPicker = (key: number) => {
    setActiveLineKey(key);
    setSelectedMaterialKeys([]);
    setSelectedMaterials([]);
    setMaterialOpen(true);
    void loadMaterials();
  };

  const fillMaterialRows = (picked: MaterialRow[]) => {
    if (activeLineKey == null || picked.length === 0) return;
    setLines(prev => {
      const next = [...prev];
      let start = next.findIndex(line => line.key === activeLineKey);
      if (start < 0) start = 0;
      picked.forEach((material, offset) => {
        const target = start + offset;
        while (target >= next.length) next.push(nextLine(next));
        next[target] = applyAuxiliaryMaterialToLine(next[target], material);
      });
      return normalizeLineNo(next);
    });
    setMaterialOpen(false);
  };

  const loadSuppliers = useCallback(async () => {
    setSupplierLoading(true);
    try {
      const result = await supplierApi.list(1, 300, supplierKeyword.trim());
      setSuppliers(result.items as SupplierRow[]);
    } catch {
      message.error("加载供应商资料失败");
    } finally {
      setSupplierLoading(false);
    }
  }, [supplierKeyword]);

  const openSupplierPicker = () => {
    setSupplierOpen(true);
    void loadSuppliers();
  };

  const pickSupplier = (supplier: SupplierRow) => {
    form.setFieldsValue({
      供应商编号: supplier.供应商编号,
      供应商名称: supplier.供应商名称,
    });
    setSupplierOpen(false);
  };

  const save = async () => {
    if (openedNo) {
      message.warning("当前为已保存单据，请点「新建」后再录入新单");
      return;
    }
    const values = await form.validateFields();
    const payload = buildAuxiliaryPurchasePayload({
      supplierNo: values.供应商编号,
      supplierName: values.供应商名称,
      deliveryDate: values.交货日期?.format("YYYY-MM-DD"),
      note: values.备注,
      lines,
    });
    if (!payload.供应商编号) {
      message.error("请先选择供应商");
      return;
    }
    if (payload.明细.length === 0) {
      message.error("请至少录入一行有效辅料明细(辅料编号 + 数量)");
      return;
    }
    setSaving(true);
    try {
      const result = await purchaseOrderApi.create(payload);
      setOpenedNo(result.单号);
      setOpenedAudit("0");
      form.setFieldValue("电脑单号", result.单号);
      message.success(`辅料采购订单已创建: ${result.单号}`);
    } catch (error) {
      message.error(parseError(error, "保存辅料采购订单失败"));
    } finally {
      setSaving(false);
    }
  };

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const result = await purchaseOrderApi.list(1, 80, "");
      setOrders(result.items.filter(row => !row.生产单号));
    } catch {
      message.error("加载采购订单列表失败");
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const openOrdersModal = () => {
    setOpenModal(true);
    void loadOrders();
  };

  const openDoc = async (orderNo?: string) => {
    if (!orderNo) return;
    try {
      const detail = await purchaseOrderApi.get(orderNo);
      const header = detail.单头;
      form.setFieldsValue({
        供应商编号: header?.供应商编号,
        供应商名称: header?.供应商名称,
        日期: header?.日期 ? dayjs(header.日期) : dayjs(),
        交货日期: header?.交货日期 ? dayjs(header.交货日期) : undefined,
        电脑单号: header?.单号,
        备注: header?.备注,
        操作员: header?.操作员 ?? currentUser(),
        单价类型: "人民币",
      });
      const detailLines = (detail.明细 ?? [])
        .filter(line => !line.物料类别 || line.物料类别 === AUXILIARY_PURCHASE_ORDER_CATEGORY)
        .map((line, index) => toAuxiliaryLine(line, index));
      const blanks = createAuxiliaryPurchaseLines(Math.max(0, 20 - detailLines.length))
        .map(line => ({ ...line, key: line.key + detailLines.length, 序号: line.序号 + detailLines.length }));
      setLines(normalizeLineNo([...detailLines, ...blanks]));
      setOpenedNo(header?.单号 ?? orderNo);
      setOpenedAudit(header?.审核);
      setOpenModal(false);
    } catch {
      message.error("打开辅料采购订单失败");
    }
  };

  const deleteDoc = async () => {
    if (!openedNo) return;
    try {
      await purchaseOrderApi.remove(openedNo);
      message.success("已删除");
      reset();
    } catch (error) {
      message.error(parseError(error, "删除失败"));
    }
  };

  const approveDoc = async () => {
    if (!openedNo) return;
    try {
      await purchaseOrderApi.approve(openedNo);
      setOpenedAudit("1");
      message.success("已审核");
    } catch (error) {
      message.error(parseError(error, "审核失败"));
    }
  };

  const unapproveDoc = async () => {
    if (!openedNo) return;
    try {
      await purchaseOrderApi.unapprove(openedNo);
      setOpenedAudit("0");
      message.success("已反审核");
    } catch (error) {
      message.error(parseError(error, "反审核失败"));
    }
  };

  const fillLastNo = async () => {
    try {
      const result = await purchaseOrderApi.list(1, 1, "");
      form.setFieldValue("电脑单号", result.items[0]?.单号 ?? "");
    } catch {
      message.error("读取最后号码失败");
    }
  };

  const materialColumns: ColumnsType<MaterialRow> = [
    { title: "辅料编号", dataIndex: "物料编号", width: 125 },
    { title: "辅料名称", dataIndex: "物料名称", width: 290 },
    { title: "规格", dataIndex: "规格", width: 125 },
    { title: "每单位数值", dataIndex: "码换算", width: 110 },
    { title: "单位", dataIndex: "单位", width: 90 },
    { title: "备注", dataIndex: "备注", width: 250 },
  ];

  const supplierColumns: ColumnsType<SupplierRow> = [
    { title: "供应商编号", dataIndex: "供应商编号", width: 120 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 260 },
    { title: "类别", dataIndex: "供应商类别", width: 120 },
    { title: "联系人", dataIndex: "联系人", width: 110 },
    { title: "手机", dataIndex: "手机", width: 130 },
  ];

  const lineColumns: ColumnsType<AuxiliaryPurchaseLine> = [
    {
      title: "",
      width: 40,
      align: "center",
      render: (_v, row) => (
        <Button
          type="text"
          size="small"
          icon={<CloseOutlined />}
          onClick={() => removeLine(row.key)}
          aria-label="删除明细行"
        />
      ),
    },
    { title: "辅料编号", dataIndex: "辅料编号", width: 140, render: (_v, row) => (
      <Input value={row.辅料编号} onChange={e => patchLine(row.key, { 辅料编号: e.target.value })} />
    ) },
    { title: "辅料名称", dataIndex: "辅料名称", width: 250, render: (_v, row) => (
      <Input
        readOnly
        value={row.辅料名称}
        onClick={() => openMaterialPicker(row.key)}
        suffix={<SearchOutlined style={{ color: "#1677ff" }} />}
      />
    ) },
    { title: "规格", dataIndex: "规格", width: 145, render: (_v, row) => (
      <Input value={row.规格} onChange={e => patchLine(row.key, { 规格: e.target.value })} />
    ) },
    { title: "单位", dataIndex: "单位", width: 90, render: (_v, row) => (
      <Input value={row.单位} onChange={e => patchLine(row.key, { 单位: e.target.value })} />
    ) },
    { title: "数量", dataIndex: "数量", width: 115, align: "right", render: (_v, row) => (
      <InputNumber min={0} value={row.数量} style={{ width: 95 }} onChange={value => patchLine(row.key, { 数量: value })} />
    ) },
    { title: "备注", dataIndex: "备注", width: 230, render: (_v, row) => (
      <Input value={row.备注} onChange={e => patchLine(row.key, { 备注: e.target.value })} />
    ) },
  ];

  const orderColumns: ColumnsType<PurchaseOrderHeader> = [
    { title: "日期", dataIndex: "日期", width: 105, render: fmtDate },
    { title: "单号", dataIndex: "单号", width: 140, render: (value: string) => <a className="erp-num">{value}</a> },
    { title: "供应商编号", dataIndex: "供应商编号", width: 110 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 220 },
    { title: "交货日期", dataIndex: "交货日期", width: 105, render: fmtDate },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" },
    { title: "金额", dataIndex: "金额", width: 105, align: "right" },
    { title: "审核", dataIndex: "审核", width: 80, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
  ];

  return (
    <Card
      title="辅料采购单"
      variant="borderless"
      extra={
        <Space wrap>
          <Button icon={<FileAddOutlined />} onClick={reset}>新建</Button>
          <Button icon={<FolderOpenOutlined />} onClick={openOrdersModal}>打开</Button>
          <Button icon={<SaveOutlined />} type="primary" loading={saving} disabled={!canSave || !!openedNo} onClick={save}>保存</Button>
          <Popconfirm title="确认删除该单据?" disabled={!openedNo || openedAudit === "1" || !canDelete} onConfirm={deleteDoc}>
            <Button icon={<DeleteOutlined />} disabled={!openedNo || openedAudit === "1" || !canDelete}>删除</Button>
          </Popconfirm>
          <Button disabled>调入清单</Button>
          <Button icon={<ReloadOutlined />} onClick={loadMaterials}>刷新</Button>
          <Button disabled>资料</Button>
          <Button disabled>前单</Button>
          <Button disabled>后单</Button>
          <Button icon={<CheckOutlined />} disabled={!openedNo || openedAudit === "1" || !canApprove} onClick={approveDoc}>审核</Button>
          <Button disabled={!openedNo || openedAudit !== "1" || !canUnapprove} onClick={unapproveDoc}>反审核</Button>
          <Button icon={<TableOutlined />} disabled>表格设置</Button>
          <Button icon={<PrinterOutlined />} disabled>打印</Button>
          <Button danger icon={<CloseOutlined />} onClick={() => window.history.back()}>关闭</Button>
        </Space>
      }
    >
      <Form
        form={form}
        size="small"
        labelCol={{ flex: "72px" }}
        wrapperCol={{ flex: "auto" }}
        labelAlign="left"
        initialValues={{
          日期: dayjs(),
          交货日期: dayjs(),
          操作员: currentUser(),
          单价类型: "人民币",
        }}
      >
        <Row gutter={12}>
          <Col span={4}>
            <Form.Item label="供应商" name="供应商名称" rules={[{ required: true, message: "请选择供应商" }]}>
              <Input
                readOnly
                suffix={<SearchOutlined style={{ color: "#1677ff", cursor: "pointer" }} onClick={openSupplierPicker} />}
                onClick={openSupplierPicker}
              />
            </Form.Item>
            <Form.Item name="供应商编号" hidden><Input /></Form.Item>
          </Col>
          <Col span={3}><Form.Item label="日期" name="日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={3}><Form.Item label="交货日期" name="交货日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={4}><Form.Item label="电脑单号" name="电脑单号"><Input readOnly style={{ background: "#f7dede" }} /></Form.Item></Col>
          <Col span={2}><Button size="small" onClick={fillLastNo}>最后号码</Button></Col>
          <Col span={5}><Form.Item label="备注" name="备注"><Input /></Form.Item></Col>
          <Col span={3}><Form.Item label="操作员" name="操作员"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={4}><Form.Item label="单价类型" name="单价类型"><Select disabled options={[{ value: "人民币", label: "人民币" }, { value: "HK$", label: "HK$" }]} /></Form.Item></Col>
          <Col span={20}>
            {openedNo && (
              <Typography.Text type={openedAudit === "1" ? "success" : "secondary"}>
                当前单号：{openedNo} {openedAudit === "1" ? "已审核" : "未审核"}
              </Typography.Text>
            )}
          </Col>
        </Row>
      </Form>

      <div style={{ display: "grid", gridTemplateColumns: "1.05fr 1fr", border: "1px solid #9aa7ad", minHeight: 620 }}>
        <div style={{ borderRight: "1px solid #9aa7ad" }}>
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={lines}
            columns={lineColumns}
            scroll={{ x: "max-content", y: 610 }}
          />
        </div>
        <div style={{ background: "#fafafa" }} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 64, alignItems: "center", borderTop: "1px solid #d9d9d9", paddingTop: 12 }}>
        <Typography.Text strong style={{ fontSize: 18, color: "#0b6b2f" }}>数 量：</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#000099" }}>{summary.数量.toLocaleString()}</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#0b6b2f" }}>金 额：</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#000099" }}>{money(summary.金额)}</Typography.Text>
      </div>

      <Modal title="供应商资料" open={supplierOpen} onCancel={() => setSupplierOpen(false)} footer={null} width={760}>
        <Space style={{ marginBottom: 10 }} wrap>
          <Typography.Text>搜索：</Typography.Text>
          <Select size="small" value="供应商名称" style={{ width: 120 }} options={[{ value: "供应商名称", label: "供应商名称" }, { value: "供应商编号", label: "供应商编号" }]} />
          <Input.Search
            size="small"
            value={supplierKeyword}
            onChange={e => setSupplierKeyword(e.target.value)}
            onSearch={loadSuppliers}
            allowClear
            style={{ width: 260 }}
          />
          <Button size="small" icon={<SearchOutlined />} onClick={loadSuppliers}>查询</Button>
          <Button size="small" icon={<CheckOutlined />} onClick={() => suppliers[0] && pickSupplier(suppliers[0])}>选定</Button>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => setSupplierOpen(false)}>关闭</Button>
        </Space>
        <Table
          rowKey={(row, index) => String(row.ID ?? row.供应商编号 ?? index)}
          size="small"
          pagination={false}
          loading={supplierLoading}
          dataSource={suppliers}
          columns={supplierColumns}
          scroll={{ y: 410 }}
          onRow={row => ({
            onDoubleClick: () => pickSupplier(row),
            onClick: () => pickSupplier(row),
            style: { cursor: "pointer" },
          })}
        />
      </Modal>

      <Modal title="辅料资料查询MUGB" open={materialOpen} onCancel={() => setMaterialOpen(false)} footer={null} width={1180}>
        <Space style={{ marginBottom: 10 }} wrap>
          <Typography.Text>请选择条件：</Typography.Text>
          <Select
            size="small"
            value={materialSearchField}
            onChange={setMaterialSearchField}
            style={{ width: 120 }}
            options={[
              { value: "辅料名称", label: "辅料名称" },
              { value: "辅料编号", label: "辅料编号" },
              { value: "规格", label: "规格" },
            ]}
          />
          <Typography.Text>查询</Typography.Text>
          <Input
            size="small"
            value={materialKeyword}
            onChange={e => setMaterialKeyword(e.target.value)}
            onPressEnter={loadMaterials}
            allowClear
            style={{ width: 240 }}
          />
          <Button size="small" icon={<SearchOutlined />} onClick={loadMaterials}>查询</Button>
          <Button size="small" onClick={loadMaterials}>精确查询</Button>
          <Button size="small" onClick={() => {
            setSelectedMaterialKeys(materials.map(row => row.ID));
            setSelectedMaterials(materials);
          }}>全选</Button>
          <Button size="small" onClick={() => {
            setSelectedMaterialKeys([]);
            setSelectedMaterials([]);
          }}>反选</Button>
          <Button size="small" icon={<TableOutlined />}>表格</Button>
          <Button size="small">多选</Button>
          <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => fillMaterialRows(selectedMaterials)}>选择</Button>
          <Button size="small" danger icon={<CloseOutlined />} onClick={() => setMaterialOpen(false)}>关闭</Button>
        </Space>
        <Table
          rowKey="ID"
          size="small"
          pagination={false}
          loading={materialLoading}
          dataSource={materials}
          columns={materialColumns}
          scroll={{ x: "max-content", y: 560 }}
          rowSelection={{
            selectedRowKeys: selectedMaterialKeys,
            onChange: (keys, rows) => {
              setSelectedMaterialKeys(keys);
              setSelectedMaterials(rows);
            },
            columnTitle: "多选",
          }}
          onRow={row => ({
            onDoubleClick: () => fillMaterialRows([row]),
            onClick: () => {
              setSelectedMaterialKeys([row.ID]);
              setSelectedMaterials([row]);
            },
            style: { cursor: "pointer" },
          })}
        />
      </Modal>

      <Modal title="打开辅料采购订单" open={openModal} onCancel={() => setOpenModal(false)} footer={null} width={980}>
        <Table
          rowKey={row => row.单号}
          size="small"
          pagination={false}
          loading={ordersLoading}
          dataSource={orders}
          columns={orderColumns}
          scroll={{ x: "max-content", y: 480 }}
          onRow={row => ({
            onClick: () => openDoc(row.单号),
            style: { cursor: "pointer" },
          })}
        />
      </Modal>
    </Card>
  );
}

function toAuxiliaryLine(line: PurchaseOrderLine, index: number): AuxiliaryPurchaseLine {
  return {
    key: index + 1,
    序号: index + 1,
    辅料编号: line.物料编号,
    辅料名称: line.物料名称,
    规格: line.规格,
    颜色: line.颜色,
    单位: line.单位,
    数量: line.数量 ?? 0,
    单价: line.单价 ?? 0,
    备注: "",
  };
}
