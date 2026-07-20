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
  Space,
  Table,
  Typography,
  message,
  Select,
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
import { materialStocktakeApi, type MSHeader, type MSLineRow } from "../../api/materialStocktake";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  applyAuxiliaryStocktakeMaterialToLine,
  AUXILIARY_ISSUE_CATEGORY,
  AUXILIARY_ISSUE_WAREHOUSE,
  buildAuxiliaryStocktakePayload,
  compactAuxiliaryStocktakeLines,
  createAuxiliaryStocktakeLines,
  summarizeAuxiliaryStocktakeLines,
  type AuxiliaryStocktakeLine,
} from "../../utils/auxiliaryIssue";

const API_MENU = "盘点单";
const currentUser = () => localStorage.getItem("erp_user") || "admin";
const fmtDate = (value?: string | null) => (value ? String(value).slice(0, 10) : "");
const formatQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 3 });

interface HeaderForm {
  日期?: Dayjs;
  电脑单号?: string;
  操作员?: string;
  备注?: string;
}

const parseError = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;

const nextLine = (lines: AuxiliaryStocktakeLine[]): AuxiliaryStocktakeLine => {
  const maxKey = lines.reduce((max, line) => Math.max(max, Number(line.key) || 0), 0);
  return {
    key: maxKey + 1,
    序号: lines.length + 1,
    系统数量: 0,
    盘点数量: 0,
    盈亏数量: 0,
    备注: "",
  };
};

const normalizeLineNo = (lines: AuxiliaryStocktakeLine[]) =>
  lines.map((line, index) => ({
    ...line,
    key: index + 1,
    序号: index + 1,
    盈亏数量: Number(line.盘点数量 ?? 0) - Number(line.系统数量 ?? 0),
  }));

function toAuxiliaryLine(line: MSLineRow, index: number): AuxiliaryStocktakeLine {
  const 系统数量 = Number(line.系统数量 ?? 0);
  const 盘点数量 = Number(line.盘点数量 ?? 0);
  return {
    key: index + 1,
    序号: index + 1,
    辅料编号: line.物料编号,
    辅料名称: line.物料名称,
    规格: line.规格,
    单位: line.单位,
    系统数量,
    盘点数量,
    盈亏数量: Number(line.盈亏数量 ?? 盘点数量 - 系统数量),
    备注: "",
  };
}

export default function AuxiliaryStocktakePage() {
  const perms = usePerms();
  const canSave = can(perms, API_MENU, "保存");
  const canDelete = can(perms, API_MENU, "删除");
  const canApprove = can(perms, API_MENU, "审核");
  const canUnapprove = can(perms, API_MENU, "反审核");
  const [form] = Form.useForm<HeaderForm>();
  const [lines, setLines] = useState<AuxiliaryStocktakeLine[]>(() => createAuxiliaryStocktakeLines(20));
  const [openedNo, setOpenedNo] = useState<string | null>(null);
  const [openedAudit, setOpenedAudit] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  const [materialOpen, setMaterialOpen] = useState(false);
  const [activeLineKey, setActiveLineKey] = useState<number | null>(null);
  const [materialKeyword, setMaterialKeyword] = useState("");
  const [materialSearchField, setMaterialSearchField] = useState("辅料名称");
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [materialLoading, setMaterialLoading] = useState(false);
  const [selectedMaterialKeys, setSelectedMaterialKeys] = useState<Key[]>([]);
  const [selectedMaterials, setSelectedMaterials] = useState<MaterialRow[]>([]);

  const [openModal, setOpenModal] = useState(false);
  const [stocktakes, setStocktakes] = useState<MSHeader[]>([]);
  const [stocktakesLoading, setStocktakesLoading] = useState(false);

  const summary = useMemo(() => summarizeAuxiliaryStocktakeLines(lines), [lines]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({
      日期: dayjs(),
      操作员: currentUser(),
    });
    setLines(createAuxiliaryStocktakeLines(20));
    setOpenedNo(null);
    setOpenedAudit(undefined);
  }, [form]);

  const patchLine = (key: number, patch: Partial<AuxiliaryStocktakeLine>) => {
    setLines(prev => prev.map(line => {
      if (line.key !== key) return line;
      const next = { ...line, ...patch };
      return {
        ...next,
        盈亏数量: Number(next.盘点数量 ?? 0) - Number(next.系统数量 ?? 0),
      };
    }));
  };

  const removeLine = (key: number) => {
    setLines(prev => {
      const next = normalizeLineNo(prev.filter(line => line.key !== key));
      return next.length ? next : createAuxiliaryStocktakeLines(1);
    });
  };

  const removeBlankLines = () => {
    const compacted = compactAuxiliaryStocktakeLines(lines);
    setLines(compacted.length ? compacted : createAuxiliaryStocktakeLines(1));
  };

  const loadMaterials = useCallback(async () => {
    setMaterialLoading(true);
    try {
      const result = await materialMasterApi.list(
        AUXILIARY_ISSUE_CATEGORY,
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
        next[target] = applyAuxiliaryStocktakeMaterialToLine(next[target], material);
      });
      return normalizeLineNo(next);
    });
    setMaterialOpen(false);
  };

  const save = async () => {
    if (openedNo) {
      message.warning("当前为已保存单据，请点「新建」后再录入新单");
      return;
    }
    const values = await form.validateFields();
    const payload = buildAuxiliaryStocktakePayload({
      date: values.日期?.format("YYYY-MM-DD"),
      note: values.备注,
      lines,
    });
    if (payload.明细.length === 0) {
      message.error("请至少录入一行有效辅料盘点明细(辅料编号)");
      return;
    }
    setSaving(true);
    try {
      const result = await materialStocktakeApi.create(payload);
      setOpenedNo(result.单号);
      setOpenedAudit("0");
      form.setFieldsValue({ 电脑单号: result.单号 });
      message.success(`辅料盘点单已创建: ${result.单号}`);
    } catch (error) {
      message.error(parseError(error, "保存辅料盘点单失败"));
    } finally {
      setSaving(false);
    }
  };

  const loadStocktakes = useCallback(async () => {
    setStocktakesLoading(true);
    try {
      const result = await materialStocktakeApi.list(1, 100, AUXILIARY_ISSUE_WAREHOUSE);
      setStocktakes(result.items.filter(row => row.仓库 === AUXILIARY_ISSUE_WAREHOUSE));
    } catch {
      message.error("加载辅料盘点单列表失败");
    } finally {
      setStocktakesLoading(false);
    }
  }, []);

  const openStocktakesModal = () => {
    setOpenModal(true);
    void loadStocktakes();
  };

  const openDoc = async (stocktakeNo?: string) => {
    if (!stocktakeNo) return;
    try {
      const detail = await materialStocktakeApi.get(stocktakeNo);
      const header = detail.单头;
      if (header?.仓库 && header.仓库 !== AUXILIARY_ISSUE_WAREHOUSE) {
        message.warning("该盘点单不是辅料仓库单据");
        return;
      }
      const detailLines = (detail.明细 ?? []).map((line, index) => toAuxiliaryLine(line, index));
      const blanks = createAuxiliaryStocktakeLines(Math.max(0, 20 - detailLines.length))
        .map(line => ({ ...line, key: line.key + detailLines.length, 序号: line.序号 + detailLines.length }));
      form.setFieldsValue({
        日期: header?.日期 ? dayjs(String(header.日期)) : dayjs(),
        电脑单号: header?.单号,
        操作员: String(header?.操作员 ?? currentUser()),
        备注: String(header?.备注 ?? ""),
      });
      setLines(normalizeLineNo([...detailLines, ...blanks]));
      setOpenedNo(header?.单号 ?? stocktakeNo);
      setOpenedAudit(header?.审核);
      setOpenModal(false);
    } catch {
      message.error("打开辅料盘点单失败");
    }
  };

  const deleteDoc = async () => {
    if (!openedNo) return;
    try {
      await materialStocktakeApi.remove(openedNo);
      message.success("已删除");
      reset();
    } catch (error) {
      message.error(parseError(error, "删除失败"));
    }
  };

  const approveDoc = async () => {
    if (!openedNo) return;
    try {
      await materialStocktakeApi.approve(openedNo);
      setOpenedAudit("1");
      message.success("已审核");
    } catch (error) {
      message.error(parseError(error, "审核失败"));
    }
  };

  const unapproveDoc = async () => {
    if (!openedNo) return;
    try {
      await materialStocktakeApi.unapprove(openedNo);
      setOpenedAudit("0");
      message.success("已反审核");
    } catch (error) {
      message.error(parseError(error, "反审核失败"));
    }
  };

  const fillLastNo = async () => {
    try {
      const result = await materialStocktakeApi.list(1, 1, AUXILIARY_ISSUE_WAREHOUSE);
      form.setFieldValue("电脑单号", result.items.find(row => row.仓库 === AUXILIARY_ISSUE_WAREHOUSE)?.单号 ?? "");
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

  const lineColumns: ColumnsType<AuxiliaryStocktakeLine> = [
    {
      title: "",
      width: 42,
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
    { title: "辅料编号", dataIndex: "辅料编号", width: 150, render: (_v, row) => (
      <Input value={row.辅料编号} onChange={e => patchLine(row.key, { 辅料编号: e.target.value })} />
    ) },
    { title: "辅料名称", dataIndex: "辅料名称", width: 290, render: (_v, row) => (
      <Input
        readOnly
        value={row.辅料名称}
        onClick={() => openMaterialPicker(row.key)}
        suffix={<SearchOutlined style={{ color: "#1677ff" }} />}
      />
    ) },
    { title: "规格", dataIndex: "规格", width: 130, render: (_v, row) => (
      <Input value={row.规格} onChange={e => patchLine(row.key, { 规格: e.target.value })} />
    ) },
    { title: "单位", dataIndex: "单位", width: 90, render: (_v, row) => (
      <Input value={row.单位} onChange={e => patchLine(row.key, { 单位: e.target.value })} />
    ) },
    { title: "系统数量", dataIndex: "系统数量", width: 120, align: "right", render: (_v, row) => (
      <InputNumber
        value={row.系统数量}
        style={{ width: 100 }}
        onChange={value => patchLine(row.key, { 系统数量: Number(value ?? 0) })}
      />
    ) },
    { title: "盘点数量", dataIndex: "盘点数量", width: 120, align: "right", render: (_v, row) => (
      <InputNumber
        value={row.盘点数量}
        style={{ width: 100 }}
        onChange={value => patchLine(row.key, { 盘点数量: Number(value ?? 0) })}
      />
    ) },
    { title: "盈亏数量", dataIndex: "盈亏数量", width: 120, align: "right", render: (_v, row) => (
      <Typography.Text>{formatQty(Number(row.盈亏数量 ?? 0))}</Typography.Text>
    ) },
    { title: "备注", dataIndex: "备注", width: 230, render: (_v, row) => (
      <Input value={row.备注} onChange={e => patchLine(row.key, { 备注: e.target.value })} />
    ) },
  ];

  const stocktakeColumns: ColumnsType<MSHeader> = [
    { title: "日期", dataIndex: "日期", width: 105, render: fmtDate },
    { title: "单号", dataIndex: "单号", width: 150, render: (value: string) => <a className="erp-num">{value}</a> },
    { title: "仓库", dataIndex: "仓库", width: 110 },
    { title: "操作员", dataIndex: "操作员", width: 110 },
    { title: "审核", dataIndex: "审核", width: 80, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
    { title: "备注", dataIndex: "备注", width: 260 },
  ];

  return (
    <Card
      title="辅料盘点单"
      variant="borderless"
      extra={
        <Space wrap>
          <Button icon={<FileAddOutlined />} onClick={reset}>新建</Button>
          <Button icon={<FolderOpenOutlined />} onClick={openStocktakesModal}>打开</Button>
          <Button icon={<SaveOutlined />} type="primary" loading={saving} disabled={!canSave || !!openedNo} onClick={save}>保存</Button>
          <Popconfirm title="确认删除该单据?" disabled={!openedNo || openedAudit === "1" || !canDelete} onConfirm={deleteDoc}>
            <Button icon={<DeleteOutlined />} disabled={!openedNo || openedAudit === "1" || !canDelete}>删除</Button>
          </Popconfirm>
          <Button icon={<ReloadOutlined />} onClick={loadMaterials}>刷新</Button>
          <Button onClick={() => lines[0] && openMaterialPicker(lines[0].key)}>资料</Button>
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
          操作员: currentUser(),
        }}
      >
        <Row gutter={12}>
          <Col span={4}><Form.Item label="日期" name="日期"><DatePicker style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={4}><Form.Item label="电脑单号" name="电脑单号"><Input readOnly style={{ background: "#eef8f8" }} /></Form.Item></Col>
          <Col span={2}><Button size="small" onClick={fillLastNo}>最后号码</Button></Col>
          <Col span={4}><Form.Item label="操作员" name="操作员"><Input disabled /></Form.Item></Col>
          <Col span={10}>
            {openedNo && (
              <Typography.Text type={openedAudit === "1" ? "success" : "secondary"}>
                当前单号：{openedNo} {openedAudit === "1" ? "已审核" : "未审核"}
              </Typography.Text>
            )}
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={10}><Form.Item label="备注" name="备注"><Input /></Form.Item></Col>
        </Row>
      </Form>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", border: "1px solid #9aa7ad", minHeight: 680 }}>
        <div style={{ borderRight: "1px solid #9aa7ad" }}>
          <Table
            rowKey="key"
            size="small"
            pagination={false}
            dataSource={lines}
            columns={lineColumns}
            scroll={{ x: "max-content", y: 665 }}
          />
        </div>
        <div style={{ background: "#f1f1f1" }} />
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 26, alignItems: "center", borderTop: "1px solid #d9d9d9", paddingTop: 12, background: "#fff5fa" }}>
        <Typography.Text strong style={{ fontSize: 18, color: "#3a1492" }}>系统数量:</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#d200b8", marginRight: 56 }}>{formatQty(summary.系统数量)}</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#3a1492" }}>盘点数量:</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#d200b8", marginRight: 56 }}>{formatQty(summary.盘点数量)}</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#3a1492" }}>盈亏数量:</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#d200b8" }}>{formatQty(summary.盈亏数量)}</Typography.Text>
        <Button size="small" danger onClick={removeBlankLines} style={{ marginLeft: "auto" }}>删除空白行</Button>
      </div>

      <Modal title="原料资料查询MUGB" open={materialOpen} onCancel={() => setMaterialOpen(false)} footer={null} width={1180}>
        <Space style={{ marginBottom: 10 }} wrap>
          <Typography.Text>请选择条件:</Typography.Text>
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

      <Modal title="打开辅料盘点单" open={openModal} onCancel={() => setOpenModal(false)} footer={null} width={980}>
        <Table
          rowKey={row => String(row.单号 ?? row.id)}
          size="small"
          pagination={false}
          loading={stocktakesLoading}
          dataSource={stocktakes}
          columns={stocktakeColumns}
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
