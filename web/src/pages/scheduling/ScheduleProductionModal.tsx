// 排期行 → 生产通知单:按排期行预填(货号/数量/客户/走货期),复用 productionApi.create(同生产通知单页)
// 前提:货号已建 BOM(bom-headers 只返回已做 BOM 物料设置的款号);未建则引导去「工程部 → BOM物料设置」
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, DatePicker, Empty, Form, Input, InputNumber, Modal, message } from "antd";
import dayjs from "dayjs";
import { stylesApi, type BomHeaderOption } from "../../api/styles";
import { productionApi } from "../../api/production";

export interface ScheduleProductionCtx {
  货号: string; 品名?: string; 数量?: number; 排期客户?: string; 客户名称?: string;
  PO号?: string; 客PO?: string; SKU?: string;
  走货期?: string; 接单日期?: string; 总箱数?: number;
}

interface FormValues {
  数量: number;
  客户编号?: string; 客户名称?: string;
  交货日期?: dayjs.Dayjs; 下单日期?: dayjs.Dayjs;
  订单总箱数?: number; 备注?: string;
}

export default function ScheduleProductionModal({ ctx, onClose }: {
  ctx: ScheduleProductionCtx | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const navigate = useNavigate();
  const [bom, setBom] = useState<BomHeaderOption | null>(null);
  const [checking, setChecking] = useState(false);
  const [noBom, setNoBom] = useState(false);
  const [saving, setSaving] = useState(false);

  // 打开时:查该货号是否已建 BOM,有才允许生成;并按排期行预填表单
  useEffect(() => {
    if (!ctx) return;
    setChecking(true); setNoBom(false); setBom(null);
    stylesApi.bomHeaders(ctx.货号)
      .then(list => {
        const hit = list.find(s => s.款号 === ctx.货号) ?? null;
        setBom(hit);
        if (!hit) { setNoBom(true); return; }
        form.setFieldsValue({
          数量: ctx.数量 ?? undefined,
          客户编号: hit.客户编号 ?? undefined,
          客户名称: hit.客户名称 ?? ctx.客户名称 ?? undefined,
          交货日期: ctx.走货期 ? dayjs(ctx.走货期) : undefined,
          下单日期: ctx.接单日期 ? dayjs(ctx.接单日期) : dayjs(),
          订单总箱数: ctx.总箱数 != null ? Math.round(ctx.总箱数) : undefined,
          备注: `排期下单:${ctx.排期客户 ?? ""}${ctx.PO号 ? ` PO=${ctx.PO号}` : ""}${ctx.客PO ? ` 客PO=${ctx.客PO}` : ""} 货号=${ctx.货号}`,
        });
      })
      .catch(() => setNoBom(true))
      .finally(() => setChecking(false));
  }, [ctx, form]);

  const submit = async () => {
    if (!ctx || !bom?.款号) return;
    let v: FormValues;
    try { v = await form.validateFields(); }
    catch { return; }
    setSaving(true);
    try {
      const r = await productionApi.create({
        客户编号: v.客户编号?.trim() || undefined,
        客户名称: v.客户名称?.trim() || undefined,
        客户款号: ctx.货号,
        合同号: ctx.PO号 || undefined,
        标识: "正单",
        订单总箱数: v.订单总箱数,
        默认单价: bom.默认单价 || undefined,
        交货日期: v.交货日期?.format("YYYY-MM-DD"),
        下单日期: v.下单日期?.format("YYYY-MM-DD"),
        备注: v.备注?.trim() || undefined,
        货号明细: [{
          货号: ctx.货号,
          BOM款号: bom.款号,
          款号名称: bom.款式 || ctx.品名 || undefined,
          分析: true, // 与生产通知单页选货号一致:分析默认打勾
          数量明细: [{ 数量: v.数量 }], // 排期无色码,一条无色码数量行(同通知单页手输数量)
        }],
      });
      message.success(`生产通知单已创建：${r.生产单号}（工序/物料已自动展开,生产通知单页可审核）`);
      onClose();
    } catch (e) {
      const msg = (e as { response?: { data?: { 消息?: string } } }).response?.data?.消息;
      message.error(msg ?? "生成生产通知单失败");
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={ctx !== null} onCancel={onClose} width={520}
      title={ctx ? `排期行生成生产通知单（货号 ${ctx.货号}）` : "生成生产通知单"}
      okText="生成生产通知单" cancelText="取消"
      confirmLoading={saving} onOk={submit}
      okButtonProps={{ disabled: noBom || checking }}
    >
      {noBom ? (
        <Empty description={
          <span>该货号还没有建 BOM,无法生成生产通知单<br />
            <span style={{ color: "#888", fontSize: 12 }}>请先到「工程部 → BOM物料设置」为款号 {ctx?.货号} 建 BOM,再回来下单</span>
          </span>}>
          <Button type="primary"
            onClick={() => navigate(`/bom-setup?款号=${encodeURIComponent(ctx?.货号 ?? "")}&品名=${encodeURIComponent(ctx?.品名 ?? "")}&客户名称=${encodeURIComponent(ctx?.排期客户 ?? ctx?.客户名称 ?? "")}&return=${encodeURIComponent("/scheduling")}`)}>
            去建 BOM
          </Button>
        </Empty>
      ) : (
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item name="数量" label="计划数量（排期数量,可改）" rules={[{ required: true, message: "请填写数量" }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="客户名称" label="客户名称（默认取 BOM 单头,其次排期客户名称）">
            <Input />
          </Form.Item>
          <Form.Item name="客户编号" label="客户编号（BOM 单头带出,可改）">
            <Input />
          </Form.Item>
          <Form.Item name="交货日期" label="交货日期（默认排期走货期）">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="下单日期" label="下单日期（默认排期接单日期）">
            <DatePicker style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="订单总箱数" label="订单总箱数（默认排期总箱数）">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="备注" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
