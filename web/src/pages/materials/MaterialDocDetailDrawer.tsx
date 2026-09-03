import { useEffect, useState } from "react";
import { Button, Descriptions, Drawer, Space, Table, Tag, message } from "antd";
import { CopyOutlined, PrinterOutlined } from "@ant-design/icons";
import { materialDocApi, type MaterialDocDetail } from "../../api/materialDocs";
import type { MaterialDocCfg } from "./materialDocConfigs";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { printMaterialDoc } from "../../utils/printDoc";

const money = (v?: number | null) => (v == null ? "***" : v);

export default function MaterialDocDetailDrawer({ cfg, 单号, onClose, onCopy, footer }: {
  cfg: MaterialDocCfg; 单号: string | null; onClose: () => void;
  onCopy?: (detail: MaterialDocDetail) => void;   // 复制单：交父级打开预填新建抽屉
  footer?: React.ReactNode;   // 抽屉底部额外操作区(如消息中心的审批按钮)
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, cfg.menu);
  const [detail, setDetail] = useState<MaterialDocDetail | null>(null);

  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    (async () => {
      try { setDetail(await materialDocApi(cfg.resource).get(单号)); }
      catch { message.error("加载单据详情失败"); }
    })();
  }, [单号, cfg.resource]);

  const h = detail?.单头;

  return (
    <Drawer title={`${cfg.title}单 ${单号 ?? ""}`} width={1200} open={!!单号} onClose={onClose} footer={footer}
      extra={detail && (
        <Space>
          {onCopy && can(perms, cfg.menu, "保存") && (
            <Button icon={<CopyOutlined />} onClick={() => onCopy(detail)}>复制单</Button>
          )}
          {can(perms, cfg.menu, "打印") && (
            <Button icon={<PrinterOutlined />}
              onClick={() => printMaterialDoc(`${cfg.title}单 ${单号 ?? ""}`, detail, { hidePrice: priceHidden, headerFields: cfg.listExtra })}>打印</Button>
          )}
        </Space>
      )}>
      {detail && (
        <>
          <Descriptions size="small" column={3} bordered style={{ marginBottom: 16 }}
            items={[
              { key: "no", label: "单号", children: h?.单号 ?? "-" },
              { key: "st", label: "状态", children: h?.审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
              // 领料单(三级审批流):补充主管/经理两级审核状态
              ...(cfg.outbound ? [
                { key: "sup", label: "主管审核", children: h?.主管审核 === "1" ? `已审核(${h?.主管审核人 ?? "-"})` : "未审核" },
                { key: "mgr", label: "经理审核", children: h?.经理审核 === "1" ? `已审核(${h?.经理审核人 ?? "-"})` : "未审核" },
              ] : []),
              { key: "qty", label: "数量", children: String(h?.数量 ?? "-") },
              { key: "amt", label: "金额", children: money(h?.金额) },
              { key: "date", label: "日期", children: h?.日期?.slice(0, 10) ?? "-" },
              ...cfg.listExtra.map(f => ({ key: f.name, label: f.label, children: String(h?.[f.name] ?? "-") })),
              { key: "memo", label: "备注", children: h?.备注 ?? "-" },
            ]} />
          <Table size="small" rowKey="id" pagination={false} dataSource={detail.明细} scroll={{ x: "max-content", y: 380 }}
            columns={[
              { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
              { title: "规格", dataIndex: "规格" }, { title: "颜色", dataIndex: "颜色" }, { title: "单位", dataIndex: "单位" },
              { title: "数量", dataIndex: "数量" },
              // 分次出库(领料单)额外两列:累计出库/未领,右对齐
              ...(cfg.outbound ? [
                { title: "已出数量", dataIndex: "已出数量", align: "right" as const, render: (v?: number | null) => v ?? 0 },
                { title: "未领", key: "_owed", align: "right" as const,
                  render: (_: unknown, r: { 数量?: number; 已出数量?: number | null }) => (r.数量 ?? 0) - (r.已出数量 ?? 0) },
              ] : []),
              { title: "单价", dataIndex: "单价", render: money },
              { title: "金额", dataIndex: "金额", render: money },
            ]} />
        </>
      )}
    </Drawer>
  );
}
