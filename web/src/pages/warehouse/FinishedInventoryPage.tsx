import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Input, Modal, Table, message } from "antd";
import { finishedInventoryApi, type FinishedStockLedgerRow, type FinishedStockRow } from "../../api/finished";
import { useAutoReload } from "../../hooks/useAutoReload";

type LedgerViewRow = FinishedStockLedgerRow & { 结存: number };

export default function FinishedInventoryPage() {
  const [rows, setRows] = useState<FinishedStockRow[]>([]);
  const [仓库, set仓库] = useState("成品仓");
  const [ledgerKey, setLedgerKey] = useState<string | null>(null);
  const [ledgerRows, setLedgerRows] = useState<FinishedStockLedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!仓库) { setRows([]); return; }
    try { setRows(await finishedInventoryApi.list(仓库)); }
    catch { if (!silent) message.error("加载成品库存失败"); }
  }, [仓库]);
  useEffect(() => { load(); }, [load]);
  useAutoReload(() => load(true));

  const openLedger = async (配件编号: string) => {
    setLedgerKey(配件编号);
    setLedgerLoading(true);
    try { setLedgerRows(await finishedInventoryApi.ledger(仓库, 配件编号)); }
    catch { message.error("加载出入库流水失败"); setLedgerRows([]); }
    finally { setLedgerLoading(false); }
  };

  // 结存：按返回顺序（后端已按 日期,单号 排序）累计 入-出
  const ledgerView = useMemo<LedgerViewRow[]>(() => {
    let bal = 0;
    return ledgerRows.map(r => {
      bal += (r.入库数量 ?? 0) - (r.出库数量 ?? 0);
      return { ...r, 结存: bal };
    });
  }, [ledgerRows]);

  const columns = [
    { title: "客户", dataIndex: "客户" },
    { title: "配件编号", dataIndex: "配件编号",
      render: (v: string) => <a onClick={() => openLedger(v)}><span className="erp-num">{v}</span></a> },
    { title: "产品货号", dataIndex: "产品货号" },
    { title: "产品名称", dataIndex: "产品名称" },
    { title: "产品装配名称", dataIndex: "产品装配名称" },
    { title: "库存数量", dataIndex: "库存数量",
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
  ];

  const ledgerColumns = [
    { title: "日期", dataIndex: "日期", render: (v?: string | null) => v?.slice(0, 10) ?? "" },
    { title: "单号", dataIndex: "单号", render: (v?: string | null) => <span className="erp-num">{v}</span> },
    { title: "类型", dataIndex: "类型" },
    { title: "入库数量", dataIndex: "入库数量", align: "right" as const },
    { title: "出库数量", dataIndex: "出库数量", align: "right" as const },
    { title: "结存", dataIndex: "结存", align: "right" as const,
      render: (v: number) => <span style={{ fontWeight: 600, color: v < 0 ? "#cf1322" : undefined }}>{v}</span> },
  ];

  return (
    <Card title="成品库存" variant="borderless"
      extra={<Input.Search placeholder="输入仓库查询" allowClear onSearch={set仓库} style={{ width: 220 }} />}>
      <Table rowKey="配件编号" size="middle" dataSource={rows} columns={columns}
        pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
        scroll={{ x: "max-content", y: "calc(100vh - 300px)" }} />
      <Modal open={ledgerKey !== null} title={`出入库流水 - ${ledgerKey ?? ""}（${仓库}）`}
        footer={null} width={760} onCancel={() => setLedgerKey(null)} destroyOnHidden>
        <Table rowKey={(r, i) => `${r.单号}|${r.类型}|${i}`} size="small" loading={ledgerLoading}
          dataSource={ledgerView} columns={ledgerColumns}
          pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
          scroll={{ x: "max-content", y: "calc(100vh - 380px)" }} />
      </Modal>
    </Card>
  );
}
