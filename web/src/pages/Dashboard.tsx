import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, Col, Row } from "antd";
import {
  TeamOutlined, ShopOutlined, AppstoreOutlined, TagsOutlined,
  GoldOutlined, ToolOutlined, ExperimentOutlined, UserOutlined,
  PlusOutlined, FileAddOutlined, ImportOutlined, ApartmentOutlined,
  ShoppingCartOutlined, RocketOutlined, InboxOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { masterApi } from "../api/master";
import { productionApi } from "../api/production";
import { purchaseOrderApi } from "../api/purchaseOrders";
import { plasticInventoryApi } from "../api/plasticInventory";
import AlertCenter from "../components/AlertCenter";

interface Stat { key: string; label: string; sub: string; grad: string; icon: ReactNode }
// 第一行:原有 4 张(来料向)
const STATS_ROW1: Stat[] = [
  { key: "customers", label: "客户总数", sub: "客户资料", grad: "linear-gradient(135deg,#6366f1,#818cf8)", icon: <TeamOutlined /> },
  { key: "suppliers", label: "供应商", sub: "供应商资料", grad: "linear-gradient(135deg,#10b981,#34d399)", icon: <ShopOutlined /> },
  { key: "materials", label: "物料种类", sub: "物料资料", grad: "linear-gradient(135deg,#f59e0b,#fbbf24)", icon: <AppstoreOutlined /> },
  { key: "quotes", label: "报价条目", sub: "报价资料", grad: "linear-gradient(135deg,#f43f5e,#fb7185)", icon: <TagsOutlined /> },
];
// 第二行:塑胶向(换一组渐变,不撞色)
const STATS_ROW2: Stat[] = [
  { key: "plastic-materials", label: "塑胶物料", sub: "塑胶物料资料", grad: "linear-gradient(135deg,#06b6d4,#22d3ee)", icon: <GoldOutlined /> },
  { key: "plastic-molds", label: "工模", sub: "工模表", grad: "linear-gradient(135deg,#8b5cf6,#a78bfa)", icon: <ToolOutlined /> },
  { key: "plastic-raw-materials", label: "塑胶原料", sub: "塑胶原料资料", grad: "linear-gradient(135deg,#f97316,#fb923c)", icon: <ExperimentOutlined /> },
  { key: "employees", label: "人员", sub: "人事档案", grad: "linear-gradient(135deg,#0ea5e9,#38bdf8)", icon: <UserOutlined /> },
];

// 业务流程步骤(点击跳对应页面)
const FLOW_STEPS = [
  { name: "建档", path: "/material-master" },
  { name: "BOM", path: "/bom-setup" },
  { name: "生产通知单", path: "/production" },
  { name: "采购分析", path: "/purchase-material-analysis" },
  { name: "采购订单", path: "/purchase-orders" },
  { name: "入仓", path: "/materials/purchase-receipts" },
  { name: "领料", path: "/materials/material-issues" },
  { name: "库存报表", path: "/plastic-inventory" },
];

const QUICK_ACTIONS = [
  { name: "新增物料", path: "/material-create", icon: <PlusOutlined /> },
  { name: "新建采购订单", path: "/purchase-orders", icon: <ShoppingCartOutlined /> },
  { name: "新建生产通知单", path: "/production", icon: <FileAddOutlined /> },
  { name: "导入表格", path: "/material-master", icon: <ImportOutlined /> },
  { name: "BOM物料设置", path: "/bom-setup", icon: <ApartmentOutlined /> },
];

const WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function StatCard({ s, v }: { s: Stat; v: number | null | undefined }) {
  return (
    <Col xs={24} sm={12} xl={6}>
      <div style={{
        borderRadius: 18, padding: "22px 22px 20px", color: "#fff", background: s.grad,
        boxShadow: "0 16px 32px -18px rgba(16,24,40,0.45)", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: 16, top: 16, fontSize: 30, opacity: 0.45 }}>{s.icon}</div>
        <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.92 }}>{s.label}</div>
        <div className="erp-num" style={{ fontSize: 32, fontWeight: 800, marginTop: 8, lineHeight: 1 }}>
          {v === undefined ? "…" : v === null ? "—" : v.toLocaleString()}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8 }}>{s.sub} · 实时</div>
      </div>
    </Col>
  );
}

export default function Dashboard() {
  const nav = useNavigate();
  const [counts, setCounts] = useState<Record<string, number | null | undefined>>({});
  const [docStats, setDocStats] = useState<{ 生产通知单?: number | null; 采购订单?: number | null; 塑胶库存?: number | null }>({});

  useEffect(() => {
    [...STATS_ROW1, ...STATS_ROW2].forEach(async (s) => {
      try {
        const r = await masterApi(s.key).list(1, 1, "");
        setCounts((p) => ({ ...p, [s.key]: r.total }));
      } catch {
        setCounts((p) => ({ ...p, [s.key]: null }));
      }
    });
    productionApi.list(1, 1, "")
      .then(r => setDocStats(p => ({ ...p, 生产通知单: r.total })))
      .catch(() => setDocStats(p => ({ ...p, 生产通知单: null })));
    purchaseOrderApi.list(1, 1, "")
      .then(r => setDocStats(p => ({ ...p, 采购订单: r.total })))
      .catch(() => setDocStats(p => ({ ...p, 采购订单: null })));
    plasticInventoryApi.list()
      .then(rows => setDocStats(p => ({ ...p, 塑胶库存: rows.reduce((s, r) => s + (r.库存数量 || 0), 0) })))
      .catch(() => setDocStats(p => ({ ...p, 塑胶库存: null })));
  }, []);

  const now = new Date();
  const dateText = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日 星期${WEEK[now.getDay()]}`;

  const docCards = [
    { label: "生产通知单", v: docStats.生产通知单, icon: <RocketOutlined />, path: "/production" },
    { label: "采购订单", v: docStats.采购订单, icon: <ShoppingCartOutlined />, path: "/purchase-orders" },
    { label: "塑胶库存合计", v: docStats.塑胶库存, icon: <InboxOutlined />, path: "/plastic-inventory" },
  ];

  return (
    <div>
      <Row gutter={[20, 20]}>
        {STATS_ROW1.map((s) => <StatCard key={s.key} s={s} v={counts[s.key]} />)}
        {STATS_ROW2.map((s) => <StatCard key={s.key} s={s} v={counts[s.key]} />)}
      </Row>

      <Row gutter={[20, 20]} style={{ marginTop: 20 }}>
        <Col xs={24} xl={14}>
          <Card variant="borderless" title="业务流程" style={{ height: "100%" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {FLOW_STEPS.map((st, i) => (
                <span key={st.path} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span
                    onClick={() => nav(st.path)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer",
                      padding: "6px 12px 6px 6px", borderRadius: 999,
                      border: "1px solid rgba(99,102,241,0.35)", transition: "background .15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.10)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <span style={{
                      width: 26, height: 26, borderRadius: "50%", display: "inline-flex",
                      alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700,
                      background: "linear-gradient(135deg,#6366f1,#818cf8)",
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 13 }}>{st.name}</span>
                  </span>
                  {i < FLOW_STEPS.length - 1 && <span style={{ opacity: 0.4 }}>→</span>}
                </span>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} xl={10}>
          <Card variant="borderless" title="单据动态" style={{ height: "100%" }}>
            <Row gutter={12}>
              {docCards.map(d => (
                <Col span={8} key={d.label}>
                  <div onClick={() => nav(d.path)} style={{ cursor: "pointer", textAlign: "center", padding: "8px 0" }}>
                    <div style={{ fontSize: 22, opacity: 0.55 }}>{d.icon}</div>
                    <div className="erp-num" style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>
                      {d.v === undefined ? "…" : d.v === null ? "—" : d.v.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.65, marginTop: 4 }}>{d.label}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
      </Row>

      <Card variant="borderless" title="快捷操作" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {QUICK_ACTIONS.map(a => (
            <Button key={a.name} icon={a.icon} shape="round" size="large" onClick={() => nav(a.path)}>
              {a.name}
            </Button>
          ))}
        </div>
      </Card>

      <AlertCenter />

      <Card variant="borderless" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8, fontWeight: 800 }}>欢迎使用 兴信B ERP</h2>
        <p style={{ margin: 0, opacity: 0.65 }}>
          服装 / 塑胶一体化生产管理系统。今天是 {dateText}。
        </p>
      </Card>
    </div>
  );
}
