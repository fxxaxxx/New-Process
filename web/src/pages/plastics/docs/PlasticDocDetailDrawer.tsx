import { useEffect, useState } from "react";
import { Button, Descriptions, Drawer, Popconfirm, Space, Table, Tag, message } from "antd";
import { plasticDocApi, type PlasticDocDetail } from "../../../api/plasticDocs";
import type { PlasticDocCfg } from "./PlasticDocConfigs";
import { can, hidePrice } from "../../../auth/permissions";
import { usePerms } from "../../../auth/PermissionContext";

const d10 = (v?: string) => v?.slice(0, 10);

export default function PlasticDocDetailDrawer({ cfg, 单号, onClose, onChanged }: {
  cfg: PlasticDocCfg; 单号: string | null; onClose: () => void; onChanged: () => void;
}) {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, cfg.menu);
  const money = (v?: number | null) => (priceHidden || v == null ? "***" : v);
  const dapi = plasticDocApi(cfg.resource);
  const [detail, setDetail] = useState<PlasticDocDetail | null>(null);

  useEffect(() => {
    if (!单号) { setDetail(null); return; }
    dapi.get(单号).then(setDetail).catch(() => message.error("加载单据失败"));
  }, [单号]);   // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<unknown>, ok: string, close: boolean) => {
    try {
      await fn(); message.success(ok); onChanged();
      if (close) onClose(); else if (单号) dapi.get(单号).then(setDetail);
    } catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const h = detail?.单头;
  const 审核 = h?.审核;
  const cols = [
    { title: "物料编号", dataIndex: "物料编号" }, { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" }, { title: "颜色", dataIndex: "颜色" },
    { title: "仓位号", dataIndex: "仓位号" }, { title: "单位", dataIndex: "单位" },
    { title: "数量", dataIndex: "数量", align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", align: "right" as const, render: money },
      { title: "金额", dataIndex: "金额", align: "right" as const, render: money },
    ]),
  ];

  return (
    <Drawer title={`${cfg.title}单 ${单号 ?? ""}`} width={960} open={!!单号} onClose={onClose}
      extra={detail && (
        <Space>
          {审核 !== "1" && can(perms, cfg.menu, "审核") && <Button onClick={() => act(() => dapi.approve(单号!), "已审核", false)}>审核</Button>}
          {审核 === "1" && can(perms, cfg.menu, "反审核") && <Button onClick={() => act(() => dapi.unapprove(单号!), "已反审核", false)}>反审核</Button>}
          {审核 !== "1" && can(perms, cfg.menu, "删除") && (
            <Popconfirm title="确认删除?" onConfirm={() => act(() => dapi.remove(单号!), "已删除", true)}><Button danger>删除</Button></Popconfirm>
          )}
        </Space>
      )}>
      {detail && h && (
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Descriptions size="small" column={3} bordered>
            <Descriptions.Item label="单号">{h.单号}</Descriptions.Item>
            <Descriptions.Item label="日期">{d10(h.日期)}</Descriptions.Item>
            <Descriptions.Item label="状态">{审核 === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>}</Descriptions.Item>
            {cfg.listExtra.map(f => <Descriptions.Item key={f.name} label={f.label}>{String(h[f.name] ?? "-")}</Descriptions.Item>)}
            <Descriptions.Item label="数量">{String(h.数量 ?? "-")}</Descriptions.Item>
            <Descriptions.Item label="金额">{money(h.金额)}</Descriptions.Item>
            <Descriptions.Item label="备注">{h.备注 ?? "-"}</Descriptions.Item>
          </Descriptions>
          <Table size="small" rowKey="id" pagination={false} scroll={{ x: true }} dataSource={detail.明细} columns={cols} />
        </Space>
      )}
    </Drawer>
  );
}
