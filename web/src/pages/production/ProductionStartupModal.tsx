import { useEffect, useState } from "react";
import { Button, Modal, Space, Statistic, Table, Tag, message } from "antd";
import { SendOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { materialInventoryApi } from "../../api/materialInventory";
import { plasticInventoryApi } from "../../api/plasticInventory";

// 生产单「一键启动」面板：审核后点一下，自动算料(BOM展开) + 查库存 + 算缺口，
// 让新手一眼看到"这批货要多少料、现在有多少、还差多少、下一步点哪个"。
// 数据全部走现有只读接口，前端聚合，零后端改动。

interface BasisRow {
  生产单号?: string; 款号?: string; 物料编号?: string; 物料名称?: string;
  规格?: string; 颜色?: string; 单位?: string; 数量?: number;
}
interface StartupRow extends BasisRow { 库存: number; 缺口: number }

export default function ProductionStartupModal({ open, 生产单号, onClose }: {
  open: boolean;
  生产单号: string;
  onClose: () => void;
}) {
  const nav = useNavigate();
  const [rows, setRows] = useState<StartupRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !生产单号) return;
    setLoading(true);
    (async () => {
      try {
        // 并行取：BOM展开应领明细(不带档=全部) + 来料库存 + 塑胶库存
        const [basis, matInv, plasticInv] = await Promise.all([
          api.get<BasisRow[]>(`/production/${encodeURIComponent(生产单号)}/issue-basis`).then(r => r.data),
          materialInventoryApi.list().catch(() => []),
          plasticInventoryApi.list().catch(() => []),
        ]);
        // 按物料编号合并两个仓的库存
        const stock: Record<string, number> = {};
        for (const s of [...matInv, ...plasticInv]) {
          if (s.物料编号) stock[s.物料编号] = (stock[s.物料编号] ?? 0) + Number(s.库存数量 ?? 0);
        }
        setRows((basis ?? []).map(b => {
          const 应领 = Number(b.数量 ?? 0);
          const 库存 = stock[b.物料编号 ?? ""] ?? 0;
          return { ...b, 库存, 缺口: Math.max(0, 应领 - 库存) };
        }));
      } catch { message.error("加载算料结果失败"); }
      finally { setLoading(false); }
    })();
  }, [open, 生产单号]);

  const 缺口种数 = rows.filter(r => r.缺口 > 0).length;
  const 总应领 = rows.reduce((s, r) => s + Number(r.数量 ?? 0), 0);
  const 总缺口 = rows.reduce((s, r) => s + r.缺口, 0);

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 110, render: (v: string) => <span style={{ fontFamily: "monospace" }}>{v}</span> },
    { title: "物料名称", dataIndex: "物料名称", width: 130 },
    { title: "规格", dataIndex: "规格", width: 100, render: (v?: string) => v ?? "—" },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "应领量", dataIndex: "数量", width: 90, align: "right" as const, render: (v?: number) => Number(v ?? 0).toLocaleString() },
    { title: "当前库存", dataIndex: "库存", width: 90, align: "right" as const,
      render: (v: number) => <span style={{ color: v < 0 ? "#cf1322" : undefined }}>{v.toLocaleString()}</span> },
    { title: "缺口", dataIndex: "缺口", width: 100, align: "right" as const,
      render: (v: number) => v > 0 ? <Tag color="red" style={{ borderRadius: 6 }}>缺 {v.toLocaleString()}</Tag> : <Tag color="green" style={{ borderRadius: 6 }}>够</Tag> },
  ];

  return (
    <Modal title={`生产启动 · ${生产单号}`} open={open} onCancel={onClose} width={860}
      footer={
        <Space>
          <Button onClick={onClose}>关闭</Button>
          <Button icon={<ShoppingCartOutlined />} onClick={() => { onClose(); nav("/purchase-material-analysis"); }}>
            去采购分析（补缺口）
          </Button>
          <Button icon={<SendOutlined />} onClick={() => { onClose(); nav(`/materials/material-issues?basis=${encodeURIComponent(生产单号)}`); }}>
            下推领料·来料仓
          </Button>
          <Button type="primary" icon={<SendOutlined />} onClick={() => { onClose(); nav(`/plastic-issues?basis=${encodeURIComponent(生产单号)}`); }}>
            下推领料·塑胶仓
          </Button>
        </Space>
      }>
      <Space size={32} style={{ marginBottom: 12 }}>
        <Statistic title="物料种类" value={rows.length} />
        <Statistic title="应领总量" value={总应领} />
        <Statistic title="缺口种类" value={缺口种数} valueStyle={{ color: 缺口种数 > 0 ? "#cf1322" : "#3f8600" }} />
        <Statistic title="缺口总量" value={总缺口} valueStyle={{ color: 总缺口 > 0 ? "#cf1322" : "#3f8600" }} />
      </Space>
      <Table size="small" rowKey={r => r.物料编号 ?? Math.random()} loading={loading}
        dataSource={rows} columns={columns} pagination={false} scroll={{ y: 360 }} />
      <div style={{ marginTop: 8, color: "#888", fontSize: 12 }}>
        缺口 = 应领量 − 当前库存；负库存表示已超发，需先补料。点「去采购分析」补缺口，点「下推领料」按应领量生成领料单。
      </div>
    </Modal>
  );
}
