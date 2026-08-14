import { useEffect, useState } from "react";
import { Badge, Card, Col, List, Row, Tag } from "antd";
import { ExclamationCircleOutlined, AuditOutlined, RightOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

// 预警中心：负库存预警 + 待审核单据。异常/待办自动冒出，不用主动去查。
// 数据来源全部为现有只读接口，前端聚合，零后端改动。

interface NegStock { 物料编号?: string; 物料名称?: string; 库存数量?: number; 仓库?: string }
interface DocTodo { label: string; path: string; total: number; unaudited: number }

// 待审核统计的单据端点（path 为前端路由，ep 为后端接口）
const DOC_ENDPOINTS: { label: string; ep: string; path: string }[] = [
  { label: "生产通知单", ep: "/production", path: "/production" },
  { label: "采购订单", ep: "/purchase-orders", path: "/purchase-orders" },
  { label: "塑胶入仓单", ep: "/plastic-receipts", path: "/plastic-receipts" },
  { label: "塑胶领料单", ep: "/plastic-issues", path: "/plastic-issues" },
  { label: "半成品入仓", ep: "/semi-receipts", path: "/semi-receipts" },
  { label: "成品入仓单", ep: "/finished-receipts", path: "/finished-receipts" },
];

const isPaged = (d: unknown): d is { items: { 审核?: string }[] } =>
  typeof d === "object" && d !== null && Array.isArray((d as { items?: unknown }).items);

export default function AlertCenter() {
  const nav = useNavigate();
  const [negStock, setNegStock] = useState<NegStock[]>([]);
  const [todos, setTodos] = useState<DocTodo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 负库存：物料库存 < 0（出库超入库，属异常，需补料或核对）
      try {
        const r = await api.get<NegStock[] | { items: NegStock[] }>("/material-inventory", { params: { page: 1, size: 200 } });
        const items = Array.isArray(r.data) ? r.data : r.data.items;
        if (alive) setNegStock(items.filter(x => Number(x.库存数量 ?? 0) < 0));
      } catch { if (alive) setNegStock([]); }

      // 待审核：逐单据统计 审核!='1' 的张数
      const results = await Promise.all(DOC_ENDPOINTS.map(async d => {
        try {
          const r = await api.get<{ 审核?: string }[] | { items: { 审核?: string }[]; total?: number }>(d.ep, { params: { page: 1, size: 100 } });
          const items = Array.isArray(r.data) ? r.data : r.data.items;
          const unaudited = items.filter(x => x.审核 !== "1").length;
          return { label: d.label, path: d.path, total: items.length, unaudited };
        } catch { return { label: d.label, path: d.path, total: 0, unaudited: 0 }; }
      }));
      if (alive) { setTodos(results); setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const alertTotal = negStock.length + todos.reduce((s, t) => s + t.unaudited, 0);

  return (
    <Card variant="borderless" style={{ marginTop: 20 }}
      title={<span><ExclamationCircleOutlined style={{ color: "#f43f5e", marginRight: 8 }} />预警中心</span>}
      extra={alertTotal > 0
        ? <Tag color="red" style={{ borderRadius: 999 }}>{alertTotal} 项待处理</Tag>
        : <Tag color="green" style={{ borderRadius: 999 }}>一切正常</Tag>}>
      <Row gutter={[20, 20]}>
        <Col xs={24} xl={12}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            库存预警（负库存）
            {negStock.length > 0 && <Badge count={negStock.length} style={{ marginLeft: 8 }} />}
          </div>
          {negStock.length === 0 ? (
            <div style={{ color: "#999", padding: "12px 0" }}>{loading ? "加载中…" : "无负库存物料"}</div>
          ) : (
            <List size="small" dataSource={negStock.slice(0, 6)}
              renderItem={x => (
                <List.Item style={{ cursor: "pointer", padding: "6px 0" }} onClick={() => nav("/material-inventory")}>
                  <span style={{ fontFamily: "monospace" }}>{x.物料编号}</span>
                  <span style={{ flex: 1, marginLeft: 8 }}>{x.物料名称}</span>
                  <span style={{ color: "#999", fontSize: 12 }}>{x.仓库}</span>
                  <Tag color="red" style={{ marginLeft: 8, borderRadius: 6 }}>{x.库存数量}</Tag>
                </List.Item>
              )} />
          )}
        </Col>
        <Col xs={24} xl={12}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>
            <AuditOutlined style={{ marginRight: 6 }} />待审核单据
          </div>
          <List size="small" dataSource={todos}
            renderItem={t => (
              <List.Item style={{ cursor: t.unaudited > 0 ? "pointer" : "default", padding: "6px 0" }}
                onClick={() => t.unaudited > 0 && nav(t.path)}>
                <span style={{ flex: 1 }}>{t.label}</span>
                {t.unaudited > 0
                  ? <><Tag color="orange" style={{ borderRadius: 6 }}>{t.unaudited} 张待审</Tag><RightOutlined style={{ fontSize: 10, color: "#bbb" }} /></>
                  : <span style={{ color: "#bbb", fontSize: 12 }}>已清</span>}
              </List.Item>
            )} />
        </Col>
      </Row>
    </Card>
  );
}
