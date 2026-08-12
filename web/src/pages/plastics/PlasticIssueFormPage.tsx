import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Checkbox, Col, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic, Table, Tag, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { plasticIssueApi, type PIHeader, type PILine } from "../../api/plasticIssue";
import { plasticInventoryApi } from "../../api/plasticInventory";
import { plasticMaterialSettingsApi } from "../../api/plasticMaterialSettings";
import { productionApi } from "../../api/production";
import type { PlasticMaterialRow } from "../../api/plasticMaterialMaster";
import { prefillDefaultWarehouse } from "../../utils/plasticSettings";
import EmployeePicker from "../materials/EmployeePicker";
import PlasticIssueLineTable from "./PlasticIssueLineTable";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "塑胶领料单";
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }; // ISO 格式：后端 DateTime 反序列化要求
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function PlasticIssueFormPage() {
  const perms = usePerms();
  const [form] = Form.useForm<Record<string, unknown>>();
  const 仓库 = Form.useWatch("仓库", form);
  const [lines, setLines] = useState<PILine[]>([]);
  const [rows, setRows] = useState<PIHeader[]>([]);
  const [opened, setOpened] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [empPickFor, setEmpPickFor] = useState<string | null>(null);
  const [basisOpen, setBasisOpen] = useState(false);     // 按生产单带入弹窗
  const [basisNo, setBasisNo] = useState("");
  const [basisLoading, setBasisLoading] = useState(false);
  const [mergePrint, setMergePrint] = useState(true);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]); // 历史单据勾选 id
  const [batchApproving, setBatchApproving] = useState(false);          // 批量审核中
  const readOnly = opened !== null;

  // 塑胶物料设置消费: 选物料后表头仓库为空时按设置的默认仓库预填(不覆盖已填)。
  const handleMaterialPicked = useCallback((row: PlasticMaterialRow) => {
    const code = (row.物料编号 ?? "").trim();
    if (!code) return;
    void plasticMaterialSettingsApi.lookup(code).then(s => {
      const wh = prefillDefaultWarehouse(form.getFieldValue("仓库") as string | undefined, s?.默认仓库);
      if (wh) form.setFieldValue("仓库", wh);
    }).catch(() => { /* 未设置/不可达则不预填 */ });
  }, [form]);

  const loadRows = useCallback(async () => {
    try { setRows((await plasticIssueApi.list(1, 50, "")).items); }
    catch { message.error("加载领料单失败"); }
  }, []);
  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    const wh = (仓库 as string) || "";
    if (!wh) { setStock({}); return; }
    plasticInventoryApi.list(wh).then(list => {
      const m: Record<string, number> = {};
      for (const r of list) if (r.物料编号) m[r.物料编号] = r.库存数量;
      setStock(m);
    }).catch(() => setStock({}));
  }, [仓库]);

  const reset = useCallback(() => {
    form.resetFields();
    form.setFieldsValue({ 日期: today(), 操作员: currentUser(), 领料备注: "生产领料" });
    setLines([]); setOpened(null);
  }, [form]);
  useEffect(() => { reset(); }, [reset]);

  const openDoc = async (单号: string) => {
    try {
      const d = await plasticIssueApi.get(单号);
      const h = d.单头 ?? {} as PIHeader;
      form.setFieldsValue({
        领料部门: h.领料部门, 领料人: h.领料人, 仓库: h.仓库, 备注: h.备注,
        日期: h.日期?.slice(0, 10), 操作员: h.操作员, 电脑单号: h.电脑单号, 收件人: h.收件人, 领料备注: h.领料备注,
        胶箱数: h.胶箱数, 纸箱数: h.纸箱数, 钙塑箱数: h.钙塑箱数, 卡板数: h.卡板数,
      });
      setLines(d.明细 ?? []); setOpened(单号);
    } catch { message.error("打开领料单失败"); }
  };

  const save = async () => {
    if (readOnly) { message.info("查看模式:请先「新建」再录入"); return; }
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.物料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有效物料明细(物料编号+数量)"); return; }
    setSaving(true);
    try {
      await plasticIssueApi.create({ ...v, 明细: ok });
      message.success("塑胶领料单已创建"); reset(); loadRows();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); loadRows(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  // 批量审核:只对勾选的未审核单逐张调审核接口,汇总成功/失败后刷新列表
  const batchApprove = async () => {
    const targets = rows.filter(r => selectedRowKeys.includes(r.id) && r.审核 !== "1");
    if (targets.length === 0) { message.info("勾选的单据均已审核"); return; }
    setBatchApproving(true);
    let ok = 0; const fails: string[] = [];
    for (const r of targets) {
      try { await plasticIssueApi.approve(r.单号!); ok++; }
      catch (e) { fails.push((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "审核失败"); }
    }
    setBatchApproving(false);
    setSelectedRowKeys([]);
    if (fails.length === 0) message.success(`已审核 ${ok} 张`);
    else message.warning(`已审核 ${ok} 张,失败 ${fails.length} 张(${fails[0]})`);
    loadRows();
  };

  // 按生产单带入:issue-basis 塑胶档应领行,数量=应领(接单数×BOM用量),可改完再保存
  const bringIssueBasis = async (生产单号: string) => {
    const no = 生产单号.trim();
    if (!no) return;
    setBasisLoading(true);
    try {
      const rows = await productionApi.issueBasis(no, "塑胶");
      if (rows.length === 0) { message.warning(`生产单 ${no} 无塑胶应领明细`); return; }
      const mapped: PILine[] = rows.map(r => ({
        生产单号: r.生产单号 ?? no,
        款号: r.款号 ?? undefined,
        物料编号: r.物料编号 ?? undefined,
        物料名称: r.物料名称 ?? undefined,
        规格: r.规格 ?? undefined,
        颜色: r.颜色 ?? undefined,
        单位: r.单位 ?? undefined,
        数量: Number(r.数量 ?? 0),
      }));
      setLines(prev => [...prev.filter(l => l.物料编号), ...mapped]);   // 丢弃空白行后追加
      message.success(`已带入 ${rows.length} 行(应领量)`);
      setBasisOpen(false); setBasisNo("");
    } catch { message.error("按生产单带入失败"); }
    finally { setBasisLoading(false); }
  };

  const stockRefRows = useMemo(() => {
    const seen = new Set<string>(); const out: { 物料编号: string; 物料名称?: string; 库存数量: number }[] = [];
    lines.forEach(l => { if (l.物料编号 && !seen.has(l.物料编号)) { seen.add(l.物料编号); out.push({ 物料编号: l.物料编号, 物料名称: l.物料名称, 库存数量: stock[l.物料编号] ?? 0 }); } });
    return out;
  }, [lines, stock]);

  const empField = (name: string, label: string, required?: boolean) => (
    <Form.Item name={name} label={label} rules={required ? [{ required: true, message: `请选${label}` }] : undefined}>
      <Input readOnly placeholder="点🔍选人"
        suffix={readOnly ? null : <SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setEmpPickFor(name)} />} />
    </Form.Item>
  );
  const numField = (name: string, label: string) => (
    <Form.Item name={name} label={label}><InputNumber min={0} precision={0} disabled={readOnly} style={{ width: "100%" }} /></Form.Item>
  );

  const listColumns = [
    { title: "领料单号", dataIndex: "单号", key: "单号", render: (v: string) => <a onClick={() => openDoc(v)} className="erp-num">{v}</a> },
    { title: "领料部门", dataIndex: "领料部门", key: "领料部门" },
    { title: "领料人", dataIndex: "领料人", key: "领料人" },
    { title: "仓库", dataIndex: "仓库", key: "仓库" },
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核", render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: PIHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => plasticIssueApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => plasticIssueApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该领料单?" onConfirm={() => act(() => plasticIssueApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title={`塑胶领料单${readOnly ? `（查看 ${opened}）` : "（新建）"}`} variant="borderless"
      extra={
        <Space wrap>
          <Button onClick={reset}>新建</Button>
          {can(perms, MENU, "保存") && <Button type="primary" loading={saving} disabled={readOnly} onClick={save}>保存</Button>}
          <Button onClick={() => window.print()}>打印</Button>
          <Checkbox checked={mergePrint} onChange={e => setMergePrint(e.target.checked)}>打印合并表格</Checkbox>
        </Space>
      }>
      <Form form={form} layout="vertical" size="small">
        <Row gutter={12}>
          <Col span={5}><Form.Item name="领料部门" label="部门"><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={4}><Form.Item name="日期" label="日期"><Input disabled /></Form.Item></Col>
          <Col span={5}>{empField("领料人", "领料人", true)}</Col>
          <Col span={4}><Form.Item name="操作员" label="操作员"><Input disabled /></Form.Item></Col>
          <Col span={3}><Form.Item name="仓库" label="仓库" rules={[{ required: true, message: "请填仓库" }]}><Input disabled={readOnly} /></Form.Item></Col>
          <Col span={3}><Form.Item name="电脑单号" label="电脑单号"><Input disabled /></Form.Item></Col>
        </Row>
        <Row gutter={12}>
          <Col span={3}>{numField("胶箱数", "胶箱数")}</Col>
          <Col span={3}>{numField("纸箱数", "纸箱")}</Col>
          <Col span={3}>{numField("钙塑箱数", "钙塑箱")}</Col>
          <Col span={3}>{numField("卡板数", "卡板数")}</Col>
          <Col span={5}>{empField("收件人", "收件人")}</Col>
          <Col span={4}>
            <Form.Item name="领料备注" label="领料备注">
              <Select disabled={readOnly} options={[{ value: "生产领料" }, { value: "样品领料" }, { value: "维修领料" }]} />
            </Form.Item>
          </Col>
          <Col span={3}><Form.Item name="备注" label="备注"><Input disabled={readOnly} /></Form.Item></Col>
        </Row>
      </Form>

      <Row gutter={12}>
        <Col span={17}>
          {!readOnly && (
            <Space style={{ marginBottom: 8 }}>
              <Button onClick={() => setBasisOpen(true)}>按生产单带入</Button>
            </Space>
          )}
          <PlasticIssueLineTable value={lines} onChange={setLines} readOnly={readOnly} onMaterialPicked={handleMaterialPicked} />
        </Col>
        <Col span={7}>
          <Table size="small" pagination={false} rowKey="物料编号"
            title={() => "库存参考"}
            dataSource={stockRefRows}
            columns={[
              { title: "序号", key: "_i", width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
              { title: "物料编号", dataIndex: "物料编号" },
              { title: "物料名称", dataIndex: "物料名称" },
              { title: "库存数量", dataIndex: "库存数量", align: "right" as const },
            ]} />
        </Col>
      </Row>

      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={lines.reduce((s, l) => s + Number(l.数量 ?? 0), 0)} />
        <Statistic title="重量合计" value={"0.0"} />
        <Statistic title="制单人" value={currentUser()} />
      </Space>

      <div style={{ marginTop: 24 }}>
        {can(perms, MENU, "审核") && (
          <Space style={{ marginBottom: 8 }}>
            <Button loading={batchApproving} disabled={selectedRowKeys.length === 0} onClick={batchApprove}>批量审核</Button>
          </Space>
        )}
        <Table rowKey="id" size="middle" dataSource={rows} columns={listColumns} pagination={{ pageSize: 10 }}
          rowSelection={{ selectedRowKeys, onChange: ks => setSelectedRowKeys(ks as number[]) }} />
      </div>

      <EmployeePicker open={empPickFor !== null}
        onPick={姓名 => { if (empPickFor) form.setFieldValue(empPickFor, 姓名); }}
        onClose={() => setEmpPickFor(null)} />
      <Modal title="按生产单带入应领明细" open={basisOpen} onCancel={() => setBasisOpen(false)} footer={null} width={420}>
        <Input.Search placeholder="输入生产单号,回车带入" enterButton="带入" loading={basisLoading}
          value={basisNo} onChange={e => setBasisNo(e.target.value)} onSearch={bringIssueBasis} />
        <div style={{ marginTop: 8, color: "#888" }}>按 BOM 展开应领量(塑胶档)带入,可改完再保存;当前空白行会被替换</div>
      </Modal>
    </Card>
  );
}
