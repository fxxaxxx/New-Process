import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, Row, Select, Space, Statistic, message } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { materialDocApi } from "../../api/materialDocs";
import { masterApi } from "../../api/master";
import { sumAmount, sumQty, validLines, type DocLine } from "../../utils/materialLines";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import type { DocFieldCfg, MaterialDocCfg } from "./materialDocConfigs";
import MaterialLineTable from "./MaterialLineTable";
import EmployeePicker from "./EmployeePicker";

// 后端 DateTime 反序列化要求 ISO 格式（zh-CN 的 2026/7/29 会 400）
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const currentUser = () => localStorage.getItem("erp_user") ?? "";

export default function MaterialDocCreateDrawer({ cfg, open, onClose, onCreated, initial, basis }: {
  cfg: MaterialDocCfg; open: boolean; onClose: () => void; onCreated: () => void;
  initial?: { header: Record<string, string>; lines: DocLine[] };   // 复制单时预填
  basis?: string;   // 下推入口：生产通知单带过来的生产单号,自动带入应领明细
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, cfg.menu);
  const [form] = Form.useForm<Record<string, string>>();
  const 供应商编号 = Form.useWatch("供应商编号", form);
  const 仓库 = Form.useWatch("仓库", form);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [empPickFor, setEmpPickFor] = useState<string | null>(null); // 选人(退料人/领料人)的字段名
  // 接受人候选：人事档案中 职称=仓管/PMC 的人（打开抽屉时加载一次）
  const [recipients, setRecipients] = useState<string[]>([]);
  useEffect(() => {
    if (!open || !cfg.headerFields.some(f => f.type === "recipient")) return;
    (async () => {
      try {
        const r = await masterApi("employees").list(1, 2000);
        setRecipients((r.items as Record<string, unknown>[])
          .filter(x => x.职称 === "仓管" || x.职称 === "PMC")
          .map(x => String(x.姓名 ?? ""))
          .filter(Boolean));
      } catch { /* 候选人加载失败时下拉为空,保存时后端仍会校验 */ }
    })();
  }, [open, cfg.headerFields]);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    setLines(initial?.lines ?? []);
    if (initial?.header) form.setFieldsValue(initial.header);
  }, [open, form, cfg.resource, initial]);

  // 按字段 type 渲染单头控件
  const renderField = (f: DocFieldCfg) => {
    switch (f.type) {
      case "date-today":
        return <Input disabled />;
      case "docno":
        return <Input disabled placeholder="保存后自动生成" />;
      case "operator":
        return <Input disabled />;
      case "select":
        return <Select allowClear={!f.required} options={(f.options ?? []).map(v => ({ value: v, label: v }))} />;
      case "recipient":
        return (
          <Select showSearch optionFilterProp="label" placeholder="选择仓管/PMC"
            options={recipients.map(v => ({ value: v, label: v }))} />
        );
      case "employee":
        return (
          <Input readOnly placeholder="点🔍选人"
            suffix={<SearchOutlined style={{ cursor: "pointer", color: "#1677ff" }} onClick={() => setEmpPickFor(f.name)} />} />
        );
      default:
        return <Input />;
    }
  };

  const submit = async () => {
    let v: Record<string, string>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = validLines(lines);
    if (ok.length === 0) { message.error("请至少录入一行有效物料明细"); return; }
    setSaving(true);
    try {
      await materialDocApi(cfg.resource).create({ ...v, 明细: ok });
      message.success(`${cfg.title}单已创建`);
      onClose(); onCreated();
    } catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
      message.error(msg ?? "创建失败");
    } finally { setSaving(false); }
  };

  return (
    <Drawer title={`${initial ? "复制新建" : "新建"}${cfg.title}单`} width={1360} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical" initialValues={Object.fromEntries(
        cfg.headerFields.flatMap(f =>
          f.type === "date-today" ? [[f.name, today()]]
          : f.type === "operator" ? [[f.name, currentUser()]]
          : f.defaultValue != null ? [[f.name, f.defaultValue]]
          : [])
      )}>
        <Row gutter={16}>
          {cfg.headerFields.map(f => (
            <Col span={8} key={f.name}>
              <Form.Item name={f.name} label={f.label}
                rules={f.required ? [{ required: true, message: `请填写${f.label}` }] : undefined}>
                {renderField(f)}
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
      <EmployeePicker
        open={empPickFor !== null}
        onPick={姓名 => { if (empPickFor) form.setFieldValue(empPickFor, 姓名); }}
        onClose={() => setEmpPickFor(null)}
      />
      <MaterialLineTable value={lines} onChange={setLines} hidePriceCols={priceHidden}
        enableOrderPicker={cfg.orderPicker} usageCols={cfg.usageCols} 供应商={供应商编号 as string | undefined}
        initialBasis={basis}
        仓库={仓库 as string | undefined}
        onSupplier={(编号, 名称) => {
          // 整单带入顺带带出供应商:仅表头供应商编号为空时回写,不覆盖已填
          if (!(form.getFieldValue("供应商编号") as string)) form.setFieldsValue({ 供应商编号: 编号, 供应商名称: 名称 });
        }} />
      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={sumQty(lines)} />
        {!priceHidden && !cfg.usageCols && <Statistic title="金额合计" value={sumAmount(lines).toFixed(2)} />}
      </Space>
    </Drawer>
  );
}
