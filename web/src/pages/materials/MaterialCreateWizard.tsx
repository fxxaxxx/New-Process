import { useState } from "react";
import { Button, Card, Col, Form, Input, InputNumber, Radio, Row, Select, Space, message } from "antd";
import { PlusOutlined, CheckOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { materialMasterApi } from "../../api/materialMaster";
import { masterApi } from "../../api/master";

// 物料一处建档（快速建档向导）：一个页面建 来料/塑胶/原料 三种物料，
// 新手不用记"这个料进哪个菜单"。先选类别 → 填核心字段 → 保存写入对应库。
// 细节专业字段（塑胶的模具日产量/啤机价钱等）建档后可到专页补。
// 来料编号留空由后端自动生成；塑胶/原料需填编号。

type CategoryKey = "materials" | "plastic-materials" | "plastic-raw-materials";

const CATEGORIES: { key: CategoryKey; label: string; hint: string }[] = [
  { key: "materials", label: "来料物料", hint: "辅料/包装/五金等（编号留空自动生成）" },
  { key: "plastic-materials", label: "塑胶物料", hint: "注塑胶件/半成品" },
  { key: "plastic-raw-materials", label: "塑胶原料", hint: "PVC/ABS 等原料" },
];

const UNITS = ["PCS", "KG", "G", "M", "CM", "SET", "BOX", "包", "个"];

export default function MaterialCreateWizard() {
  const nav = useNavigate();
  const [form] = Form.useForm<Record<string, unknown>>();
  const [cat, setCat] = useState<CategoryKey>("materials");
  const [saving, setSaving] = useState(false);
  const autoCode = cat === "materials";

  const save = async () => {
    let v: Record<string, unknown>;
    try { v = await form.validateFields(); } catch { return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        物料编号: (v.物料编号 as string)?.trim() || undefined,   // 来料留空后端自动生成
        物料名称: v.物料名称,
        物料类别: v.物料类别,
        规格: v.规格,
        颜色: v.颜色,
        单位: v.单位 ?? "PCS",
        单价: v.单价,
        备注: v.备注,
      };
      if (cat === "materials") {
        Object.assign(body, { 供应商编号: v.供应商编号, 仓库位置: v.仓库位置, 销售价: v.销售价 });
        await materialMasterApi.create(body);
      } else if (cat === "plastic-materials") {
        Object.assign(body, { 工模编号: v.工模编号, 款号: v.款号, 客户编号: v.客户编号 });
        await masterApi("plastic-materials").create(body);
      } else {
        Object.assign(body, { 商品名称: v.商品名称, 产地: v.产地, 每包重量: v.每包重量, 安全库存: v.安全库存, 起订量: v.起订量 });
        await masterApi("plastic-raw-materials").create(body);
      }
      message.success(`${CATEGORIES.find(c => c.key === cat)!.label}已建档`);
      form.resetFields();
      form.setFieldsValue({ 单位: "PCS" });
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "建档失败");
    } finally { setSaving(false); }
  };

  const txt = (name: string, label: string, required = false, span = 6, placeholder?: string) => (
    <Col span={span} key={name}>
      <Form.Item name={name} label={label} rules={required ? [{ required: true, message: `请填${label}` }] : undefined}>
        <Input placeholder={placeholder} allowClear />
      </Form.Item>
    </Col>
  );

  return (
    <Card title="物料快速建档（一处建档）" variant="borderless"
      extra={<Space>
        <Button type="primary" icon={<CheckOutlined />} loading={saving} onClick={save}>保存</Button>
      </Space>}>
      <Form form={form} layout="vertical" size="small" initialValues={{ 单位: "PCS" }}>
        <Form.Item label="物料类别（先选这个，决定进哪个库）" required>
          <Radio.Group value={cat} onChange={e => setCat(e.target.value as CategoryKey)} optionType="button" buttonStyle="solid">
            {CATEGORIES.map(c => <Radio.Button key={c.key} value={c.key}>{c.label}</Radio.Button>)}
          </Radio.Group>
          <div style={{ color: "#888", fontSize: 12, marginTop: 6 }}>{CATEGORIES.find(c => c.key === cat)!.hint}</div>
        </Form.Item>

        <Row gutter={12}>
          {txt("物料编号", autoCode ? "物料编号（留空自动）" : "物料编号", !autoCode, 6, autoCode ? "留空自动生成" : "请输入编号")}
          {txt("物料名称", "物料名称", true, 6)}
          {txt("物料类别", "小类/类别", false, 6)}
          <Col span={3}>
            <Form.Item name="单位" label="单位"><Select options={UNITS.map(u => ({ value: u }))} /></Form.Item>
          </Col>
          <Col span={3}>
            <Form.Item name="单价" label="单价"><InputNumber min={0} precision={4} style={{ width: "100%" }} /></Form.Item>
          </Col>
        </Row>
        <Row gutter={12}>
          {txt("规格", "规格", false, 6)}
          {txt("颜色", "颜色", false, 6)}
          {cat === "materials" && txt("供应商编号", "供应商编号", false, 6)}
          {cat === "materials" && txt("仓库位置", "仓库位置", false, 6)}
          {cat === "plastic-materials" && txt("工模编号", "工模编号", false, 6)}
          {cat === "plastic-materials" && txt("款号", "款号", false, 6)}
          {cat === "plastic-raw-materials" && txt("商品名称", "商品名称", false, 6)}
          {cat === "plastic-raw-materials" && txt("产地", "产地", false, 6)}
          {cat === "plastic-raw-materials" && (
            <Col span={6}><Form.Item name="每包重量" label="每包重量"><InputNumber min={0} style={{ width: "100%" }} /></Form.Item></Col>
          )}
        </Row>
        <Row gutter={12}>
          {txt("备注", "备注", false, 12)}
        </Row>
      </Form>
      <div style={{ color: "#888", fontSize: 12, marginTop: 4 }}>
        这是快速建档：先把料建起来。塑胶的模具日产量/啤机价钱、原料的起订量等专业字段，建档后可到对应专页补全。
        <Button type="link" icon={<PlusOutlined />} onClick={() => nav(cat === "materials" ? "/material-master" : cat === "plastic-materials" ? "/plastic-material-master" : "/plastic-raw-material-master")}>
          去专页补全细节
        </Button>
      </div>
    </Card>
  );
}
