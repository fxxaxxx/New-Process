import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, Row, Space, Statistic, message } from "antd";
import { plasticDocApi, type PlasticDocLine } from "../../../api/plasticDocs";
import { hidePrice } from "../../../auth/permissions";
import { usePerms } from "../../../auth/PermissionContext";
import type { PlasticDocCfg } from "./PlasticDocConfigs";
import PlasticLineTable from "./PlasticLineTable";

export default function PlasticDocCreateDrawer({ cfg, open, onClose, onCreated }: {
  cfg: PlasticDocCfg; open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, cfg.menu);
  const [form] = Form.useForm<Record<string, string>>();
  const [lines, setLines] = useState<PlasticDocLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) { form.resetFields(); setLines([]); } }, [open, form, cfg.resource]);

  const submit = async () => {
    let v: Record<string, string>;
    try { v = await form.validateFields(); } catch { return; }
    const ok = lines.filter(l => l.物料编号 && Number(l.数量) > 0);
    if (ok.length === 0) { message.error("请至少录入一行有效物料明细"); return; }
    setSaving(true);
    try {
      await plasticDocApi(cfg.resource).create({ ...v, 明细: ok });
      message.success(`${cfg.title}单已创建`); onClose(); onCreated();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "创建失败");
    } finally { setSaving(false); }
  };

  const sumQty = lines.reduce((s, l) => s + (Number(l.数量) || 0), 0);
  const sumAmt = lines.reduce((s, l) => s + (Number(l.数量) || 0) * (Number(l.单价) || 0), 0);

  return (
    <Drawer title={`新建${cfg.title}单`} width={960} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} onClick={submit}>保存</Button>}>
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          {cfg.headerFields.map(f => (
            <Col span={8} key={f.name}>
              <Form.Item name={f.name} label={f.label}
                rules={f.required ? [{ required: true, message: `请填写${f.label}` }] : undefined}>
                <Input />
              </Form.Item>
            </Col>
          ))}
        </Row>
      </Form>
      <PlasticLineTable value={lines} onChange={setLines} hidePriceCols={priceHidden} />
      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={sumQty} />
        {!priceHidden && <Statistic title="金额合计" value={sumAmt.toFixed(2)} />}
      </Space>
    </Drawer>
  );
}
