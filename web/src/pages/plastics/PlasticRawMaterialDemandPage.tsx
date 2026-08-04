import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { plasticRawMaterialDemandApi, type RMDHeader, type RMDLine } from "../../api/plasticRawMaterialDemand";
import EmployeePicker from "../materials/EmployeePicker";
import PlasticRawMaterialDemandLineTable from "./PlasticRawMaterialDemandLineTable";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "原料生产需求表";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // ISO 格式：后端 DateTime 反序列化要求
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function PlasticRawMaterialDemandPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [form] = Form.useForm<Record<string, unknown>>();
  const [lines, setLines] = useState<RMDLine[]>([]);
  const [rows, setRows] = useState<RMDHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const readOnly = opened !== null;

  const loadRows = useCallback(async () => {
    try { setRows((await plasticRawMaterialDemandApi.list(1, 50, "")).items); }
    catch { message.error("加载原料生产需求表失败"); }
  }, []);
  useEffect(() => { if (canOpen) loadRows(); }, [canOpen, loadRows]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 开单日期: today(), 操作员: currentUser(), 领料备注: "生产领料" });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset]);

  const openDoc = async (单号: string) => {
    try {
      const d = await plasticRawMaterialDemandApi.get(单号);
      const h = d.单头 ?? {} as RMDHeader;
      form.setFieldsValue({
        啤机生产单号: h.啤机生产单号, 制单人: h.制单人, 领料备注: h.领料备注, 生产车间: h.生产车间, 备注: h.备注,
        开单日期: h.开单日期?.slice(0, 10), 操作员: h.操作员,
      });
      setLines(d.明细 ?? []); setOpened(单号);
    } catch { message.error("打开原料生产需求表失败"); }
  };

  const save = async () => {
    if (readOnly) { message.info("查看模式:请先「新建」再录入"); return; }
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.原料编号 && (Number(l.需求数量KG) > 0 || Number(l.需求数量包) > 0));
    if (ok.length === 0) { message.error("请至少录入一行有效明细(原料编号+需求数量)"); return; }
    setSaving(true);
    try {
      await plasticRawMaterialDemandApi.create({ ...v, 明细: ok });
      message.success("原料生产需求表已创建"); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const 合计KG = lines.reduce((s, l) => s + Number(l.需求数量KG ?? 0), 0);
  const 合计包 = lines.reduce((s, l) => s + Number(l.需求数量包 ?? 0), 0);

  const listColumns: ColumnsType<RMDHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "啤机生产单号", dataIndex: "啤机生产单号", key: "啤机生产单号" },
    { title: "制单人", dataIndex: "制单人", key: "制单人" },
    { title: "生产车间", dataIndex: "生产车间", key: "生产车间" },
    { title: "数量KG", dataIndex: "数量KG", key: "数量KG" },
    { title: "数量包", dataIndex: "数量包", key: "数量包" },
    { title: "日期", dataIndex: "开单日期", key: "开单日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: RMDHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => plasticRawMaterialDemandApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => plasticRawMaterialDemandApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该原料生产需求表?" onConfirm={() => act(() => plasticRawMaterialDemandApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"原料生产需求表·打开"权限）。</div></Card>;
  }

  return (
    <Card title={`原料生产需求表${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
      extra={
        <Space wrap>
          <Button onClick={reset}>新建</Button>
          {can(perms, MENU, "保存") && <Button type="primary" loading={saving} disabled={readOnly} onClick={save}>保存</Button>}
          <Button onClick={() => window.print()}>打印</Button>
        </Space>
      }>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={6}><Form.Item name="啤机生产单号" label="啤机生产单号"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="开单日期" label="开单日期"><Input disabled /></Form.Item></Col>
          <Col span={5}>
            <Form.Item name="制单人" label="制单人" rules={[{ required: true, message: "请选制单人" }]}>
              <Input readOnly placeholder="点🔍选人"
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setEmpOpen(true)} />} />
            </Form.Item>
          </Col>
          <Col span={4}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
          <Col span={5}>
            <Form.Item name="领料备注" label="领料备注">
              <Select disabled={readOnly} options={[{ value: "生产领料" }, { value: "样品领料" }, { value: "维修领料" }]} />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          <Col span={6}><Form.Item name="生产车间" label="生产车间"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={18}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <PlasticRawMaterialDemandLineTable value={lines} onChange={setLines} readOnly={readOnly} />

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="需求数量(KG)合计" value={合计KG} precision={2} />
        <Statistic title="需求数量(包)合计" value={合计包} precision={2} />
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }} />
      </div>

      <EmployeePicker open={empOpen} onPick={姓名 => form.setFieldValue("制单人", 姓名)} onClose={() => setEmpOpen(false)} />
    </Card>
  );
}
