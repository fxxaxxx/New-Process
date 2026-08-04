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
  CopyOutlined,
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
import { materialDocApi, type MaterialDocHeader } from "../../api/materialDocs";
import { materialMasterApi, type MaterialRow } from "../../api/materialMaster";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import {
  applyAuxiliaryIssueMaterialToLine,
  AUXILIARY_ISSUE_CATEGORY,
  buildAuxiliaryReturnPayload,
  compactAuxiliaryIssueLines,
  createAuxiliaryIssueLines,
  summarizeAuxiliaryIssueLines,
  type AuxiliaryIssueLine,
} from "../../utils/auxiliaryIssue";
import { adjacentDocNo } from "../../utils/docNav";
import { printMaterialDoc } from "../../utils/printDoc";
const API_MENU = "退料单";
const returnApi = materialDocApi("material-returns");
const currentUser = () => localStorage.getItem("erp_user") || "admin";
const fmtDate = (value?: string | null) => (value ? String(value).slice(0, 10) : "");
const formatQty = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 3 });

interface HeaderForm {
  部门?: string;
  日期?: Dayjs;
  退料人?: string;
  电脑单号?: string;
  备注?: string;
  操作员?: string;
}

interface ReturnDetailLine {
  id?: number;
  ID?: number;
  物料编号?: string;
  物料名称?: string;
  物料类别?: string;
  规格?: string;
  颜色?: string;
  单位?: string;
  数量?: number;
  单价?: number | null;
  金额?: number | null;
  备注?: string;
  生产单号?: string;
  款号?: string;
}

const parseError = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? fallback;

const nextLine = (lines: AuxiliaryIssueLine[]): AuxiliaryIssueLine => {
  const maxKey = lines.reduce((max, line) => Math.max(max, Number(line.key) || 0), 0);
  return {
    key: maxKey + 1,
    序号: lines.length + 1,
    数量: 0,
    备注: "",
  };
};

const normalizeLineNo = (lines: AuxiliaryIssueLine[]) =>
  lines.map((line, index) => ({ ...line, key: index + 1, 序号: index + 1 }));

function toAuxiliaryLine(line: ReturnDetailLine, index: number, headerDate: string): AuxiliaryIssueLine {
  return {
    key: index + 1,
    序号: index + 1,
    装配生产单号: line.生产单号,
    开单日期: headerDate,
    辅料编号: line.物料编号,
    辅料名称: line.物料名称,
    规格: line.规格,
    颜色: line.颜色,
    单位: line.单位,
    数量: line.数量 ?? 0,
    单价: line.单价 ?? 0,
    备注: line.备注 ?? "",
  };
}

export default function AuxiliaryReturnPage() {
  const perms = usePerms();
  const canSave = can(perms, API_MENU, "保存");
  const canDelete = can(perms, API_MENU, "删除");
  const canApprove = can(perms, API_MENU, "审核");
  const canUnapprove = can(perms, API_MENU, "反审核");
  const canPrint = can(perms, API_MENU, "打印");
  const [form] = Form.useForm<HeaderForm>();
  const [lines, setLines] = useState<AuxiliaryIssueLine[]>(() => createAuxiliaryIssueLines(20));
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
  const [returns, setReturns] = useState<MaterialDocHeader[]>([]);
  const [returnsLoading, setReturnsLoading] = useState(false);

  const summary = useMemo(() => summarizeAuxiliaryIssueLines(lines), [lines]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({
      日期: dayjs(),
      操作员: currentUser(),
    });
    setLines(createAuxiliaryIssueLines(20));
    setOpenedNo(null);
    setOpenedAudit(undefined);
  }, [form]);

  const patchLine = (key: number, patch: Partial<AuxiliaryIssueLine>) => {
    setLines(prev => prev.map(line => (line.key === key ? { ...line, ...patch } : line)));
  };

  const removeLine = (key: number) => {
    setLines(prev => {
      const next = normalizeLineNo(prev.filter(line => line.key !== key));
      return next.length ? next : createAuxiliaryIssueLines(1);
    });
  };

  const removeBlankLines = () => {
    const compacted = compactAuxiliaryIssueLines(lines);
    setLines(compacted.length ? compacted : createAuxiliaryIssueLines(1));
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
        next[target] = applyAuxiliaryIssueMaterialToLine(next[target], material);
      });
      return normalizeLineNo(next);
    });
    setMaterialOpen(false);
  };

  const save = async () => {
    if (openedNo) {
      message.warning("当前为已保存单据，请点“新建”后再录入新单");
      return;
    }
    const values = await form.validateFields();
    const payload = buildAuxiliaryReturnPayload({
      department: values.部门,
      returnPerson: values.退料人,
      date: values.日期?.format("YYYY-MM-DD"),
      note: values.备注,
      lines,
    });
    if (payload.明细.length === 0) {
      message.error("请至少录入一行有效退库明细(辅料编号 + 数量)");
      return;
    }
    setSaving(true);
    try {
      const result = await returnApi.create(payload as unknown as Record<string, unknown>);
      setOpenedNo(result.单号);
      setOpenedAudit("0");
      form.setFieldsValue({ 电脑单号: result.单号 });
      message.success(`辅料退库单已创建: ${result.单号}`);
    } catch (error) {
      message.error(parseError(error, "保存辅料退库单失败"));
    } finally {
      setSaving(false);
    }
  };

  const loadReturns = useCallback(async () => {
    setReturnsLoading(true);
    try {
      const result = await returnApi.list(1, 100, "");
      setReturns(result.items);
    } catch {
      message.error("加载辅料退库单列表失败");
    } finally {
      setReturnsLoading(false);
    }
  }, []);

  const openReturnsModal = () => {
    setOpenModal(true);
    void loadReturns();
  };

  const openDoc = async (returnNo?: string) => {
    if (!returnNo) return;
    try {
      const detail = await returnApi.get(returnNo);
      const header = detail.单头;
      const headerDate = fmtDate(header?.日期);
      const detailLines = ((detail.明细 ?? []) as ReturnDetailLine[])
        .filter(line => !line.物料类别 || line.物料类别 === AUXILIARY_ISSUE_CATEGORY)
        .map((line, index) => toAuxiliaryLine(line, index, headerDate));
      const blanks = createAuxiliaryIssueLines(Math.max(0, 20 - detailLines.length))
        .map(line => ({ ...line, key: line.key + detailLines.length, 序号: line.序号 + detailLines.length }));
      form.setFieldsValue({
        部门: String(header?.退料部门 ?? ""),
        日期: header?.日期 ? dayjs(String(header.日期)) : dayjs(),
        退料人: String(header?.退料人 ?? ""),
        电脑单号: header?.单号,
        备注: String(header?.备注 ?? ""),
        操作员: String(header?.操作员 ?? currentUser()),
      });
      setLines(normalizeLineNo([...detailLines, ...blanks]));
      setOpenedNo(header?.单号 ?? returnNo);
      setOpenedAudit(header?.审核);
      setOpenModal(false);
    } catch {
      message.error("打开辅料退库单失败");
    }
  };

  // 前单/后单：用列表端点拉退库单，按单号升序定位相邻单（口径见 utils/docNav）
  const move = async (next: boolean) => {
    if (!openedNo) return;
    setSaving(true);
    try {
      const result = await returnApi.list(1, 1000, "");
      const target = adjacentDocNo(result.items.map(row => row.单号), openedNo, next);
      if (!target) message.info(next ? "已经是最后一张单据" : "已经是第一张单据");
      else await openDoc(target);
    } catch {
      message.error("切换单据失败");
    } finally {
      setSaving(false);
    }
  };

  // 打印：重新拉取单据明细，用项目已有的 printMaterialDoc 输出（尊重单价保密权限）
  const doPrint = async () => {
    if (!openedNo) return;
    try {
      const detail = await returnApi.get(openedNo);
      printMaterialDoc(`辅料退库单 ${openedNo}`, detail, {
        hidePrice: hidePrice(perms, API_MENU),
        headerFields: [
          { name: "退料部门", label: "退料部门" },
          { name: "退料人", label: "退料人" },
        ],
      });
    } catch {
      message.error("读取单据失败，无法打印");
    }
  };

  const deleteDoc = async () => {
    if (!openedNo) return;
    try {
      await returnApi.remove(openedNo);
      message.success("已删除");
      reset();
    } catch (error) {
      message.error(parseError(error, "删除失败"));
    }
  };

  const approveDoc = async () => {
    if (!openedNo) return;
    try {
      await returnApi.approve(openedNo);
      setOpenedAudit("1");
      message.success("已审核");
    } catch (error) {
      message.error(parseError(error, "审核失败"));
    }
  };

  const unapproveDoc = async () => {
    if (!openedNo) return;
    try {
      await returnApi.unapprove(openedNo);
      setOpenedAudit("0");
      message.success("已反审核");
    } catch (error) {
      message.error(parseError(error, "反审核失败"));
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

  const lineColumns: ColumnsType<AuxiliaryIssueLine> = [
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
    { title: "装配生产单号", dataIndex: "装配生产单号", width: 150, render: (_v, row) => (
      <Input value={row.装配生产单号} onChange={e => patchLine(row.key, { 装配生产单号: e.target.value })} />
    ) },
    { title: "开单日期", dataIndex: "开单日期", width: 115, render: (_v, row) => (
      <Input value={row.开单日期} onChange={e => patchLine(row.key, { 开单日期: e.target.value })} />
    ) },
    { title: "辅料编号", dataIndex: "辅料编号", width: 140, render: (_v, row) => (
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
    { title: "数量", dataIndex: "数量", width: 115, align: "right", render: (_v, row) => (
      <InputNumber
        min={0}
        value={row.数量}
        style={{ width: 95 }}
        onChange={value => patchLine(row.key, { 数量: typeof value === "number" ? value : Number(value ?? 0) })}
      />
    ) },
    { title: "备注", dataIndex: "备注", width: 230, render: (_v, row) => (
      <Input value={row.备注} onChange={e => patchLine(row.key, { 备注: e.target.value })} />
    ) },
  ];

  const returnColumns: ColumnsType<MaterialDocHeader> = [
    { title: "日期", dataIndex: "日期", width: 105, render: fmtDate },
    { title: "单号", dataIndex: "单号", width: 150, render: (value: string) => <a className="erp-num">{value}</a> },
    { title: "退料部门", dataIndex: "退料部门", width: 140 },
    { title: "退料人", dataIndex: "退料人", width: 110 },
    { title: "仓库", dataIndex: "仓库", width: 100 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" },
    { title: "审核", dataIndex: "审核", width: 80, render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
  ];

  return (
    <Card
      title="辅料退库表"
      variant="borderless"
      extra={
        <Space wrap>
          <Button icon={<FileAddOutlined />} onClick={reset}>新建</Button>
          <Button icon={<FolderOpenOutlined />} onClick={openReturnsModal}>打开</Button>
          <Button icon={<SaveOutlined />} type="primary" loading={saving} disabled={!canSave || !!openedNo} onClick={save}>保存</Button>
          <Popconfirm title="确认删除该单据?" disabled={!openedNo || openedAudit === "1" || !canDelete} onConfirm={deleteDoc}>
            <Button icon={<DeleteOutlined />} disabled={!openedNo || openedAudit === "1" || !canDelete}>删除</Button>
          </Popconfirm>
          <Button icon={<CopyOutlined />} disabled>复制单</Button>
          <Button icon={<ReloadOutlined />} onClick={loadMaterials}>刷新</Button>
          <Button onClick={() => lines[0] && openMaterialPicker(lines[0].key)}>资料</Button>
          <Button disabled={!openedNo || saving} onClick={() => void move(false)}>前单</Button>
          <Button disabled={!openedNo || saving} onClick={() => void move(true)}>后单</Button>
          <Button icon={<CheckOutlined />} disabled={!openedNo || openedAudit === "1" || !canApprove} onClick={approveDoc}>审核</Button>
          <Button disabled={!openedNo || openedAudit !== "1" || !canUnapprove} onClick={unapproveDoc}>反审核</Button>
          <Button icon={<TableOutlined />} disabled>表格设置</Button>
          <Button icon={<PrinterOutlined />} disabled={!openedNo || !canPrint} onClick={() => void doPrint()}>打印</Button>
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
          <Col span={4}>
            <Form.Item label="部门" name="部门" rules={[{ required: true, message: "请选择部门" }]}>
              <Select allowClear options={[]} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="日期" name="日期">
              <DatePicker style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="退料人" name="退料人" rules={[{ required: true, message: "请输入退料人" }]}>
              <Input suffix={<SearchOutlined style={{ color: "#1677ff" }} />} />
            </Form.Item>
          </Col>
          <Col span={4}>
            <Form.Item label="电脑单号" name="电脑单号">
              <Input readOnly style={{ background: "#eef8f8" }} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={8}><Form.Item label="备注" name="备注"><Input /></Form.Item></Col>
          <Col span={4}><Form.Item label="操作员" name="操作员"><Input disabled /></Form.Item></Col>
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

      <div style={{ marginTop: 12, display: "flex", gap: 16, alignItems: "center", borderTop: "1px solid #d9d9d9", paddingTop: 12 }}>
        <Typography.Text strong style={{ fontSize: 18, color: "#0b6b2f" }}>数量:</Typography.Text>
        <Typography.Text strong style={{ fontSize: 18, color: "#000099", marginRight: 64 }}>{formatQty(summary.数量)}</Typography.Text>
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

      <Modal title="打开辅料退库单" open={openModal} onCancel={() => setOpenModal(false)} footer={null} width={980}>
        <Table
          rowKey={row => String(row.单号 ?? row.id)}
          size="small"
          pagination={false}
          loading={returnsLoading}
          dataSource={returns}
          columns={returnColumns}
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
