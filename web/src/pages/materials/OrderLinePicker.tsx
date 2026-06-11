import { useCallback, useEffect, useState } from "react";
import { Input, Modal, Table } from "antd";
import { purchaseOrderApi, type PurchaseOrderProgressRow } from "../../api/purchaseOrders";

// 采购订单明细选择器：仅列已审核、有欠数的订单行(复用订单进度表端点)，点行返回。
export default function OrderLinePicker({ open, 供应商, onPick, onClose }: {
  open: boolean;
  供应商?: string;
  onPick: (row: PurchaseOrderProgressRow) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PurchaseOrderProgressRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await purchaseOrderApi.progress({
        onlyOwed: true,
        供应商: 供应商 || undefined,
        keyword: keyword.trim() || undefined,
      });
      setRows(r);
    } catch { /* 忽略 */ }
    finally { setLoading(false); }
  }, [供应商, keyword]);

  // 每次打开重新加载(供应商可能变)
  useEffect(() => { if (open) load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    { title: "订单单号", dataIndex: "采购单号", width: 130 },
    { title: "款号", dataIndex: "款号", width: 100 },
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称", width: 130 },
    { title: "规格", dataIndex: "规格", width: 90 },
    { title: "颜色", dataIndex: "颜色", width: 70 },
    { title: "单位", dataIndex: "单位", width: 56 },
    { title: "订购", dataIndex: "订购数量", width: 70, align: "right" as const },
    { title: "已入仓", dataIndex: "入仓数量", width: 72, align: "right" as const },
    {
      title: "欠数", dataIndex: "欠数", width: 70, align: "right" as const,
      render: (v?: number | null) => <b style={{ color: "#cf1322" }}>{v ?? 0}</b>,
    },
  ];

  return (
    <Modal title="选择采购订单明细（仅列欠数行）" open={open} onCancel={onClose} footer={null} width={940}>
      <Input.Search
        placeholder="款号/物料/生产单号" allowClear style={{ width: 260, marginBottom: 12 }}
        value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load}
      />
      <Table
        size="small" rowKey={(_, i) => String(i)} loading={loading} dataSource={rows} columns={columns}
        scroll={{ x: true, y: 360 }} pagination={false}
        onRow={r => ({ onClick: () => { onPick(r); onClose(); }, style: { cursor: "pointer" } })}
      />
    </Modal>
  );
}
