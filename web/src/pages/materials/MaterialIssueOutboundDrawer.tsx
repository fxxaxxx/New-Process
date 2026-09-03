import { useEffect, useState } from "react";
import { Button, Drawer, InputNumber, Table, Typography, message } from "antd";
import { materialDocApi, type MaterialDocDetail } from "../../api/materialDocs";

type Line = MaterialDocDetail["明细"][number];

// 领料单分次出库抽屉：申请数量=装配部填报，已出数量=累计出库；本次出库默认=未领，可改小或填0跳过；
// 只提交 本次出库>0 的行，提交后立即扣库存；全部出完时单据自动「已审核(完成)」。
export default function MaterialIssueOutboundDrawer({ 单号, open, onClose, onDone }: {
  单号: string | null; open: boolean; onClose: () => void; onDone: () => void;
}) {
  const [detail, setDetail] = useState<MaterialDocDetail | null>(null);
  const [qtys, setQtys] = useState<Record<number, number>>({}); // 行ID -> 本次出库数量
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !单号) { setDetail(null); return; }
    (async () => {
      try {
        const d = await materialDocApi("material-issues").get(单号);
        setDetail(d);
        const init: Record<number, number> = {};
        for (const l of d.明细) {
          const 未领 = (l.数量 ?? 0) - (l.已出数量 ?? 0);
          init[l.id] = 未领 > 0 ? 未领 : 0;
        }
        setQtys(init);
      } catch { message.error("加载领料单失败"); }
    })();
  }, [open, 单号]);

  const submit = async () => {
    if (!单号 || !detail) return;
    const payload = detail.明细
      .map(l => ({ 行ID: l.id, 数量: Number(qtys[l.id] ?? 0) }))
      .filter(x => x.数量 > 0);
    if (payload.length === 0) { message.info("没有需要出库的行(本次出库均为 0)"); return; }
    setSaving(true);
    try {
      const r = await materialDocApi("material-issues").outbound(单号, payload);
      if (r.完成) message.success(`出库完成:${r.出库行数} 行已全部出完,单据已自动审核`);
      else message.success(`部分出库:${r.出库行数} 行已出库,剩余可再次出库`);
      onClose();
      onDone();
    } catch (e) {
      message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "出库失败");
    } finally { setSaving(false); }
  };

  return (
    <Drawer title={`领料出库 ${单号 ?? ""}`} width={820} open={open} onClose={onClose}
      extra={<Button type="primary" loading={saving} disabled={!detail} onClick={submit}>出库</Button>}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
        申请数量=装配部填报，已出数量=累计出库；本次出库默认未领数量，可改小或填 0 跳过；提交后立即扣库存。
      </Typography.Paragraph>
      {detail && (
        <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细} scroll={{ x: "max-content", y: 420 }}
          columns={[
            { title: "物料编号", dataIndex: "物料编号", width: 120 },
            { title: "物料名称", dataIndex: "物料名称", width: 150 },
            { title: "颜色", dataIndex: "颜色", width: 90 },
            { title: "单位", dataIndex: "单位", width: 60 },
            { title: "申请数量", dataIndex: "数量", width: 90, align: "right" as const, render: (v?: number) => v ?? 0 },
            { title: "已出数量", dataIndex: "已出数量", width: 90, align: "right" as const, render: (v?: number | null) => v ?? 0 },
            {
              title: "未领", key: "_owed", width: 90, align: "right" as const,
              render: (_: unknown, r: Line) => (r.数量 ?? 0) - (r.已出数量 ?? 0),
            },
            {
              title: "本次出库", key: "_out", width: 110,
              render: (_: unknown, r: Line) => {
                const 未领 = (r.数量 ?? 0) - (r.已出数量 ?? 0);
                return (
                  <InputNumber min={0} max={未领} precision={2} style={{ width: 96 }}
                    disabled={未领 <= 0} value={qtys[r.id] ?? 0}
                    onChange={n => setQtys(prev => ({ ...prev, [r.id]: Number(n ?? 0) }))} />
                );
              },
            },
          ]} />
      )}
    </Drawer>
  );
}
