import { useCallback, useEffect, useState } from "react";
import { Button, Card, Col, DatePicker, Form, Input, Popconfirm, Row, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";
import dayjs from "dayjs";
import { plasticProcessPurchaseOrderApi, type PPPOHeader, type PPPOLine } from "../../api/plasticProcessPurchaseOrder";
import FactoryPicker from "./FactoryPicker";
import ProductionPicker from "../materials/ProductionPicker";
import PlasticProcessPurchaseOrderLineTable from "./PlasticProcessPurchaseOrderLineTable";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { 二次加工字母 } from "../../utils/secondProcess";

const MENU = "塑胶加工采购单";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // ISO 格式：后端 DateTime 反序列化要求
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function PlasticProcessPurchaseOrderPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const [form] = Form.useForm<Record<string, unknown>>();
  const [lines, setLines] = useState<PPPOLine[]>([]);
  const [rows, setRows] = useState<PPPOHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [factoryOpen, setFactoryOpen] = useState(false);
  const [prodOpen, setProdOpen] = useState(false);
  const readOnly = opened !== null;

  const loadRows = useCallback(async () => {
    try { setRows((await plasticProcessPurchaseOrderApi.list(1, 50, "")).items); }
    catch { message.error("加载单据失败"); }
  }, []);
  useEffect(() => { if (canOpen) loadRows(); }, [canOpen, loadRows]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 日期: today(), 操作员: currentUser() });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset]);

  const bringFromProduction = async (生产单号: string) => {
    if (!生产单号) return;
    try {
      const bom = await plasticProcessPurchaseOrderApi.basis(生产单号);
      // 二次加工(BD/AF/AH)的 BOM 行展开为 第一次/第二次 两条明细,便于按加工次序分给不同供应商下单
      const ls: PPPOLine[] = [];
      for (const b of bom) {
        const base: PPPOLine = {
          生产单号: b.生产单号, 款号: b.款号, 模具编号: b.模具编号, 物料编号: b.物料编号, 物料名称: b.物料名称,
          用料名称: b.用料名称, 颜色: b.颜色, 加工内容: b.加工内容,
          数量: 0, 单价: b.单价 ?? 0,
        };
        if (b.二次加工类别) {
          ls.push({ ...base, 加工次序: "第一次", 加工字母: 二次加工字母(b.二次加工类别, b.加工内容) ?? undefined });
          ls.push({ ...base, 加工内容: b.二次加工内容, 加工次序: "第二次", 加工字母: 二次加工字母(b.二次加工类别, b.二次加工内容) ?? undefined });
        } else {
          ls.push(base);
        }
      }
      setLines(ls);
      message.success(`已调入生产单 ${生产单号} 的加工清单`);
    } catch { message.error("调入清单失败"); }
  };

  const openDoc = async (单号: string) => {
    try {
      const d = await plasticProcessPurchaseOrderApi.get(单号);
      const h = d.单头 ?? {} as PPPOHeader;
      form.setFieldsValue({
        加工厂编号: h.加工厂编号, 加工厂名称: h.加工厂名称, 客户名称: h.客户名称,
        收货仓库: h.收货仓库, 收货人: h.收货人, 备注: h.备注, 操作员: h.操作员,
        日期: h.日期?.slice(0, 10),
        交货日期: h.交货日期 ? dayjs(h.交货日期) : undefined,
      });
      setLines(d.明细 ?? []); setOpened(单号);
    } catch { message.error("打开单据失败"); }
  };

  const save = async () => {
    if (readOnly) { message.info("查看模式:请先「新建」再录入"); return; }
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.物料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有效物料明细(物料编号+数量)"); return; }
    const 交货日期 = v.交货日期 ? (v.交货日期 as dayjs.Dayjs).format("YYYY-MM-DD") : null;
    setSaving(true);
    try {
      await plasticProcessPurchaseOrderApi.create({ ...v, 交货日期, 明细: ok });
      message.success("塑胶加工采购单已创建"); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const 数量合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0), 0);
  const 金额合计 = lines.reduce((s, l) => s + Number(l.数量 ?? 0) * Number(l.单价 ?? 0), 0);

  const listColumns: ColumnsType<PPPOHeader> = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "加工厂", dataIndex: "加工厂名称", key: "加工厂名称" },
    { title: "客户", dataIndex: "客户名称", key: "客户名称" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: PPPOHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => plasticProcessPurchaseOrderApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => plasticProcessPurchaseOrderApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该单据?" onConfirm={() => act(() => plasticProcessPurchaseOrderApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶加工采购单·打开"权限）。</div></Card>;
  }

  return (
    <Card title={`塑胶加工采购单${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
      extra={
        <Space wrap>
          <Button onClick={reset}>新建</Button>
          {can(perms, MENU, "保存") && <Button type="primary" loading={saving} disabled={readOnly} onClick={save}>保存</Button>}
          <Button disabled={readOnly} onClick={() => setProdOpen(true)}>调入加工清单</Button>
          <Button onClick={() => window.print()}>打印</Button>
        </Space>
      }>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={6}>
            <Form.Item name="加工厂名称" label="加工厂" rules={[{ required: true, message: "请选加工厂" }]}>
              <Input readOnly placeholder="点🔍选加工厂"
                suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setFactoryOpen(true)} />} />
            </Form.Item>
            <Form.Item name="加工厂编号" hidden><Input /></Form.Item>
          </Col>
          <Col span={4}><Form.Item name="日期" label="日期"><Input disabled /></Form.Item></Col>
          <Col span={4}><Form.Item name="交货日期" label="交货日期"><DatePicker style={{ width: "100%" }} disabled={readOnly} /></Form.Item></Col>
          <Col span={5}><Form.Item name="客户名称" label="客户名称"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={5}><Form.Item name="收货仓库" label="收货仓库"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={5}><Form.Item name="收货人" label="收货人"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
          <Col span={15}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <PlasticProcessPurchaseOrderLineTable value={lines} onChange={setLines} readOnly={readOnly} hidePrice={priceHidden} />

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={数量合计} />
        {!priceHidden && <Statistic title="金额合计" value={金额合计} precision={2} />}
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }} />
      </div>

      <FactoryPicker open={factoryOpen}
        onPick={row => form.setFieldsValue({ 加工厂编号: row.加工厂编号, 加工厂名称: row.加工厂名称 })}
        onClose={() => setFactoryOpen(false)} />
      <ProductionPicker open={prodOpen} onPick={row => bringFromProduction(row.生产单号 ?? "")} onClose={() => setProdOpen(false)} />
    </Card>
  );
}
