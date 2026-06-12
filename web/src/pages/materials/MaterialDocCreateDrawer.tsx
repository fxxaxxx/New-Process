import { useEffect, useState } from "react";
import { Button, Col, Drawer, Form, Input, Row, Space, Statistic, message } from "antd";
import { materialDocApi } from "../../api/materialDocs";
import { sumAmount, sumQty, validLines, type DocLine } from "../../utils/materialLines";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import type { MaterialDocCfg } from "./materialDocConfigs";
import MaterialLineTable from "./MaterialLineTable";

export default function MaterialDocCreateDrawer({ cfg, open, onClose, onCreated }: {
  cfg: MaterialDocCfg; open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, cfg.menu);
  const [form] = Form.useForm<Record<string, string>>();
  const 供应商编号 = Form.useWatch("供应商编号", form);
  const [lines, setLines] = useState<DocLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields(); setLines([]);
  }, [open, form, cfg.resource]);

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
    <Drawer title={`新建${cfg.title}单`} width={920} open={open} onClose={onClose}
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
      <MaterialLineTable value={lines} onChange={setLines} hidePriceCols={priceHidden}
        enableOrderPicker={cfg.orderPicker} 供应商={供应商编号 as string | undefined} />
      <Space style={{ marginTop: 16 }} size={32}>
        <Statistic title="数量合计" value={sumQty(lines)} />
        {!priceHidden && <Statistic title="金额合计" value={sumAmount(lines).toFixed(2)} />}
      </Space>
    </Drawer>
  );
}
