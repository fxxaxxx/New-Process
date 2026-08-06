import { useCallback, useEffect, useState } from "react";
import { Card, Select, Table, message } from "antd";
import { outsourcingApi, type OutHeader, type OutReconcileRow } from "../../api/outsourcing";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

// 菜单权限名"发外对数"(后端 reconcile 接口同名门控)
const MENU = "发外对数";

export default function OutsourceReconcilePage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const [dispatched, setDispatched] = useState<OutHeader[]>([]);
  const [发外单号, set发外单号] = useState<string>();
  const [rows, setRows] = useState<OutReconcileRow[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const r = await outsourcingApi.list(1, 200);
        setDispatched(r.items.filter(o => o.审核 === "1"));
      } catch { message.error("加载派工单失败"); }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!发外单号) { setRows([]); return; }
    try { setRows(await outsourcingApi.reconcile(发外单号)); }
    catch { message.error("加载发外对数失败"); }
  }, [发外单号]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "款号", dataIndex: "款号" },
    { title: "加工项目", dataIndex: "加工项目" },
    { title: "发外数量", dataIndex: "发外数量" },
    { title: "回收数量", dataIndex: "回收数量" },
    { title: "相差数量", dataIndex: "相差数量" },
    { title: "单价", dataIndex: "单价", render: (v?: number | null) => (v == null ? "***" : v) },
    { title: "金额", dataIndex: "金额", render: (v?: number | null) => (v == null ? "***" : v) },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"发外对数·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="发外对数（按发外单 款×加工项目 核对发外/回收/相差）" variant="borderless"
      extra={
        <Select showSearch optionFilterProp="label" placeholder="选择已审核发外单" style={{ width: 300 }}
          value={发外单号} onChange={set发外单号}
          options={dispatched.map(o => ({ value: String(o.单号), label: `${o.单号} ${o.加工厂名称 ?? ""}` }))} />
      }>
      <Table rowKey={(r) => `${r.款号}|${r.加工项目}`} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
