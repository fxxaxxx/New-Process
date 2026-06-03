import { useEffect, useState, type ReactNode } from "react";
import { Card, Col, Row } from "antd";
import { TeamOutlined, ShopOutlined, AppstoreOutlined, TagsOutlined } from "@ant-design/icons";
import { masterApi } from "../api/master";

interface Stat { key: string; label: string; sub: string; grad: string; icon: ReactNode }
const STATS: Stat[] = [
  { key: "customers", label: "客户总数", sub: "客户资料", grad: "linear-gradient(135deg,#6366f1,#818cf8)", icon: <TeamOutlined /> },
  { key: "suppliers", label: "供应商", sub: "供应商资料", grad: "linear-gradient(135deg,#10b981,#34d399)", icon: <ShopOutlined /> },
  { key: "materials", label: "物料种类", sub: "物料资料", grad: "linear-gradient(135deg,#f59e0b,#fbbf24)", icon: <AppstoreOutlined /> },
  { key: "quotes", label: "报价条目", sub: "报价资料", grad: "linear-gradient(135deg,#f43f5e,#fb7185)", icon: <TagsOutlined /> },
];

export default function Dashboard() {
  const [counts, setCounts] = useState<Record<string, number | null | undefined>>({});

  useEffect(() => {
    STATS.forEach(async (s) => {
      try {
        const r = await masterApi(s.key).list(1, 1, "");
        setCounts((p) => ({ ...p, [s.key]: r.total }));
      } catch {
        setCounts((p) => ({ ...p, [s.key]: null }));
      }
    });
  }, []);

  return (
    <div>
      <Row gutter={[20, 20]}>
        {STATS.map((s) => {
          const v = counts[s.key];
          return (
            <Col xs={24} sm={12} xl={6} key={s.key}>
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
        })}
      </Row>

      <Card variant="borderless" style={{ marginTop: 20 }}>
        <h2 style={{ marginTop: 0, marginBottom: 8, fontWeight: 800 }}>欢迎使用 兴信B ERP</h2>
        <p style={{ color: "rgba(0,0,0,0.6)", margin: 0 }}>
          服装 / 塑胶一体化生产管理系统。请从左侧「基础资料」维护客户、供应商、加工厂、物料、报价等主数据——这些是后续接单、生产、采购的下拉数据源。
        </p>
      </Card>
    </div>
  );
}
