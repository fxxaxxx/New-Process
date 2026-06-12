import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table } from "antd";
import { productionReportApi, type ProductionTrackingRow } from "../../api/productionReports";

// 生产制单选择器：仅列已审核的生产制单(复用生产单跟踪表端点)，点行返回生产单号/款号。
export default function ProductionPicker({ open, onPick, onClose }: {
  open: boolean;
  onPick: (row: ProductionTrackingRow) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<ProductionTrackingRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // 审核="1" 只列已审核；完成不限
      setRows(await productionReportApi.tracking(keyword.trim() || undefined, "1"));
    } catch { message.error("加载生产制单失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  // 打开时重查；关键字由搜索框显式触发(onSearch)，故意不入依赖
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) load(); }, [open]);

  const columns = [
    { title: "生产单号", dataIndex: "生产单号", width: 140 },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "款式", dataIndex: "款式", width: 130 },
    { title: "客户名称", dataIndex: "客户名称", width: 130 },
    { title: "计划数量", dataIndex: "计划数量", width: 80, align: "right" as const },
    { title: "未完成", dataIndex: "未完成数", width: 80, align: "right" as const },
    { title: "交货日期", dataIndex: "交货日期", width: 110, render: (v?: string | null) => (v ? v.slice(0, 10) : "") },
  ];

  return (
    <Modal title="选择生产制单（仅列已审核）" open={open} onCancel={onClose} footer={null} width={860}>
      <Input.Search
        placeholder="生产单号/款号/款式/客户" allowClear style={{ width: 280, marginBottom: 12 }}
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
