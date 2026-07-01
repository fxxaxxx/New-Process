import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialStockIssueApi, type RSIHeader, type RSILine } from "../../api/plasticRawMaterialStockIssue";
import { plasticRawMaterialDemandApi, type RMDHeader } from "../../api/plasticRawMaterialDemand";
import EmployeePicker from "../materials/EmployeePicker";
import PlasticRawMaterialStockIssueLineTable from "./PlasticRawMaterialStockIssueLineTable";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "原料出库表";
const today = () => new Date().toLocaleDateString("zh-CN");
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function PlasticRawMaterialStockIssuePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [form] = Form.useForm<Record<string, unknown>>();
  const [lines, setLines] = useState<RSILine[]>([]);
  const [rows, setRows] = useState<RSIHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const [demandOpen, setDemandOpen] = useState(false);
  const [demands, setDemands] = useState<RMDHeader[]>([]);
  const readOnly = opened !== null;

  const loadRows = useCallback(async () => {
    try { setRows((await plasticRawMaterialStockIssueApi.list(1, 50, "")).items); }
    catch { message.error("加载原料出库单失败"); }
  }, []);
  useEffect(() => { if (canOpen) loadRows(); }, [canOpen, loadRows]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 日期: today(), 操作员: currentUser(), 领料备注: "生产领料" });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset]);

  const openDoc = async (单号: string) => {
    try {
      const d = await plasticRawMaterialStockIssueApi.get(单号);
      const h = d.单头 ?? {} as RSIHeader;
      form.setFieldsValue({
        生产车间: h.生产车间, 领料备注: h.领料备注, 制单人: h.制单人, 电脑单号: h.电脑单号, 备注: h.备注, 操作员: h.操作员,
        日期: h.日期?.slice(0, 10),
      });
      setLines(d.明细 ?? []); setOpened(单号);
    } catch { message.error("打开原料出库单失败"); }
  };

  // 调入清单:弹已审核原料生产需求表
  const openDemandPicker = async () => {
    try {
      const res = await plasticRawMaterialDemandApi.list(1, 50, "");
      setDemands(res.items.filter(o => o.审核 === "1"));
      setDemandOpen(true);
    } catch { message.error("加载原料生产需求表失败"); }
  };
  const pickDemand = async (单号: string) => {
    try {
      const d = await plasticRawMaterialDemandApi.get(单号);
      const h = d.单头 ?? {} as RMDHeader;
      const imported: RSILine[] = (d.明细 ?? []).map(l => ({
        啤机生产单号: h.啤机生产单号, 开单日期: h.开单日期?.slice(0, 10), 啤机外发单号: undefined,
        原料编号: l.原料编号, 原料名称: l.原料名称, 每包重量: l.每包重量 ?? undefined,
        单位: l.单位, 数量: Number(l.需求数量包 ?? 0),
      }));
      setLines(imported);
      form.setFieldsValue({ 生产车间: h.生产车间, 领料备注: h.领料备注 });
      setDemandOpen(false);
      message.success(`已调入需求表 ${单号} 的 ${imported.length} 行明细`);
    } catch { message.error("调入需求表失败"); }
  };

  const save = async () => {
    if (readOnly) { message.info("查看模式:请先「新建」再录入"); return; }
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.原料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有效明细(原料编号+数量)"); return; }
    setSaving(true);
    try {
      await plasticRawMaterialStockIssueApi.create({ ...v, 明细: ok });
      message.success("原料出库单已创建"); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const 数量合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0), 0);

  const listColumns: ColumnsType<RSIHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "生产车间", dataIndex: "生产车间", key: "生产车间" },
    { title: "制单人", dataIndex: "制单人", key: "制单人" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: RSIHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => plasticRawMaterialStockIssueApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => plasticRawMaterialStockIssueApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该原料出库单?" onConfirm={() => act(() => plasticRawMaterialStockIssueApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const demandColumns: ColumnsType<RMDHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => pickDemand(v)}>{v}</a> },
    { title: "啤机生产单号", dataIndex: "啤机生产单号", key: "啤机生产单号" },
    { title: "生产车间", dataIndex: "生产车间", key: "生产车间" },
    { title: "数量KG", dataIndex: "数量KG", key: "数量KG" },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料出库表·打开"权限）。</div></Card>;
  }

  return (
    <Card title={`原料出库单${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
      extra={
        <Space wrap>
          <Button onClick={reset}>新建</Button>
          {!readOnly && <Button onClick={openDemandPicker}>调入清单</Button>}
          {can(perms, MENU, "保存") && <Button type="primary" loading={saving} disabled={readOnly} onClick={save}>保存</Button>}
          <Button onClick={() => window.print()}>打印</Button>
        </Space>
      }>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={6}><Form.Item name="生产车间" label="生产车间"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="日期" label="日期"><Input disabled /></Form.Item></Col>
          <Col span={5}>
            <Form.Item name="制单人" label="制单人" rules={[{ required: true, message: "请选制单人" }]}>
              <Input readOnly placeholder="点🔍选人"
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setEmpOpen(true)} />} />
            </Form.Item>
          </Col>
          <Col span={4}><Form.Item name="电脑单号" label="电脑单号"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={5}>
            <Form.Item name="领料备注" label="领料备注">
              <Select disabled={readOnly} options={[{ value: "生产领料" }, { value: "样品领料" }, { value: "维修领料" }]} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={4}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
          <Col span={14}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <PlasticRawMaterialStockIssueLineTable value={lines} onChange={setLines} readOnly={readOnly} />

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={数量合计} precision={2} />
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }} />
      </div>

      <EmployeePicker open={empOpen} onPick={姓名 => form.setFieldValue("制单人", 姓名)} onClose={() => setEmpOpen(false)} />

      <Modal open={demandOpen} title="选择已审核原料生产需求表调入明细" footer={null} width={680} onCancel={() => setDemandOpen(false)}>
        <Table rowKey="id" size="small" dataSource={demands} columns={demandColumns} pagination={{ pageSize: 8 }} />
      </Modal>
    </Card>
  );
}
