import { useCallback, useEffect, useState } from "react";
import { Card, Select, Table, message } from "antd";
import { productionApi, type ProductionHeader } from "../../api/production";
import { pieceworkApi, type PieceSummaryRow } from "../../api/piecework";

export default function PieceworkSummaryPage() {
  const [orders, setOrders] = useState<ProductionHeader[]>([]);
  const [生产单号, set生产单号] = useState<string>();
  const [rows, setRows] = useState<PieceSummaryRow[]>([]);

  useEffect(() => {
    (async () => {
      try { setOrders((await productionApi.list(1, 200)).items); }
      catch { message.error("加载生产制单失败"); }
    })();
  }, []);

  const load = useCallback(async () => {
    if (!生产单号) { setRows([]); return; }
    try { setRows(await pieceworkApi.summary(生产单号)); }
    catch { message.error("加载计件汇总失败"); }
  }, [生产单号]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "员工号", dataIndex: "员工号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "姓名", dataIndex: "姓名" },
    { title: "工序", dataIndex: "工序名称", render: (v: string, r: PieceSummaryRow) => v ?? r.工序号 },
    { title: "计件数量", dataIndex: "数量" },
    { title: "计件金额", dataIndex: "金额", render: (v?: number | null) => (v == null ? "***" : v) },
  ];

  return (
    <Card title="计件汇总（已审核计件按工人×工序归集）" variant="borderless"
      extra={
        <Select showSearch optionFilterProp="label" placeholder="选择生产制单" style={{ width: 280 }}
          value={生产单号} onChange={set生产单号}
          options={orders.map(o => ({ value: String(o.生产单号), label: `${o.生产单号} ${o.款式 ?? ""}` }))} />
      }>
      <Table rowKey={(r) => `${r.员工号}|${r.工序号}`} size="middle" dataSource={rows} columns={columns}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
    </Card>
  );
}
