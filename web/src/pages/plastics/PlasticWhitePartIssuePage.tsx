import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import { plasticWhitePartIssueApi, type WPIHeader, type WPILine } from "../../api/plasticWhitePartIssue";
import EmployeePicker from "../materials/EmployeePicker";
import ProductionPicker from "../materials/ProductionPicker";
import PlasticWhitePartIssueLineTable from "./PlasticWhitePartIssueLineTable";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "白件领料单";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // ISO 格式：后端 DateTime 反序列化要求
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function PlasticWhitePartIssuePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [form] = Form.useForm<Record<string, unknown>>();
  const [lines, setLines] = useState<WPILine[]>([]);
  const [rows, setRows] = useState<WPIHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const readOnly = opened !== null;

  const loadRows = useCallback(async () => {
    try { setRows((await plasticWhitePartIssueApi.list(1, 50, "")).items); }
    catch { message.error("加载白件领料单失败"); }
  }, []);
  useEffect(() => { if (canOpen) loadRows(); }, [canOpen, loadRows]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 日期: today(), 操作员: currentUser(), 领料备注: "生产领料" });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset]);

  const bringFromProduction = async (生产单号: string) => {
    if (!生产单号) return;
    try {
      const bom = await plasticWhitePartIssueApi.basis(生产单号);
      setLines(bom.map(b => ({
        发外采购: undefined, 生产单号: b.生产单号, 款号: b.款号, 模具编号: b.模具编号,
        物料编号: b.物料编号, 物料名称: b.物料名称, 颜色: b.颜色, 用料名称: b.用料名称, 单位: b.单位,
        数量: 0,
      })));
      message.success(`已调入生产单 ${生产单号} 的白件清单`);
    } catch { message.error("调入清单失败"); }
  };

  const openDoc = async (单号: string) => {
    try {
      const d = await plasticWhitePartIssueApi.get(单号);
      const h = d.单头 ?? {} as WPIHeader;
      form.setFieldsValue({
        领料部门: h.领料部门, 领料人: h.领料人, 领料备注: h.领料备注, 备注: h.备注,
        日期: h.日期?.slice(0, 10), 操作员: h.操作员, 电脑单号: h.电脑单号,
        胶箱数: h.胶箱数, 卡板数: h.卡板数,
      });
      setLines(d.明细 ?? []); setOpened(单号);
    } catch { message.error("打开白件领料单失败"); }
  };

  const save = async () => {
    if (readOnly) { message.info("查看模式:请先「新建」再录入"); return; }
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.物料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有效物料明细(物料编号+数量)"); return; }
    setSaving(true);
    try {
      await plasticWhitePartIssueApi.create({ ...v, 明细: ok });
      message.success("白件领料单已创建"); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const 数量合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0), 0);

  const listColumns: ColumnsType<WPIHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "领料部门", dataIndex: "领料部门", key: "领料部门" },
    { title: "领料人", dataIndex: "领料人", key: "领料人" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: WPIHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => plasticWhitePartIssueApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => plasticWhitePartIssueApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该白件领料单?" onConfirm={() => act(() => plasticWhitePartIssueApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"白件领料单·打开"权限）。</div></Card>;
  }

  return (
    <Card title={`白件领料单${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
      extra={
        <Space wrap>
          <Button onClick={reset}>新建</Button>
          {can(perms, MENU, "保存") && <Button type="primary" loading={saving} disabled={readOnly} onClick={save}>保存</Button>}
          <Button disabled={readOnly} onClick={() => setProdOpen(true)}>调入清单</Button>
          <Button onClick={() => window.print()}>打印</Button>
        </Space>
      }>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={5}><Form.Item name="领料部门" label="部门"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="日期" label="日期"><Input disabled /></Form.Item></Col>
          <Col span={5}>
            <Form.Item name="领料人" label="领料人" rules={[{ required: true, message: "请选领料人" }]}>
              <Input readOnly placeholder="点🔍选人"
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setEmpOpen(true)} />} />
            </Form.Item>
          </Col>
          <Col span={4}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
          <Col span={3}><Form.Item name="电脑单号" label="电脑单号"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={3}><Form.Item name="胶箱数" label="胶箱数"><InputNumber min={0} precision={0} disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={3}><Form.Item name="卡板数" label="卡板数"><InputNumber min={0} precision={0} disabled={readOnly} style={{ width: "100%" }} /></Form.Item></Col>
          <Col span={4}>
            <Form.Item name="领料备注" label="领料备注">
              <Select disabled={readOnly} options={[{ value: "生产领料" }, { value: "样品领料" }, { value: "维修领料" }]} />
            </Form.Item>
          </Col>
          <Col span={14}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <PlasticWhitePartIssueLineTable value={lines} onChange={setLines} readOnly={readOnly} />

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={数量合计} />
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }} />
      </div>

      <EmployeePicker open={empOpen}
        onPick={姓名 => form.setFieldValue("领料人", 姓名)}
        onClose={() => setEmpOpen(false)} />
      <ProductionPicker open={prodOpen} onPick={row => bringFromProduction(row.生产单号 ?? "")} onClose={() => setProdOpen(false)} />
    </Card>
  );
}
