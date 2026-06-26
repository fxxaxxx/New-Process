import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table, Tag } from "antd";
import { plasticDocApi, type PlasticDocHeader } from "../../api/plasticDocs";

// 塑胶入仓单选择器:列已审核的塑胶入仓单,点行返回单号(调用方再 get 拉明细带出)。
export default function PlasticReceiptPicker({ open, onPick, onClose }: {
  open: boolean; onPick: (单号: string) => void; onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticDocHeader[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await plasticDocApi("plastic-receipts").list(1, 50, keyword.trim());
      setRows(r.items.filter(h => h.审核 === "1"));
    } catch { message.error("加载塑胶入仓单失败"); }
    finally { setLoading(false); }
  }, [keyword]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) load(); }, [open]);

  const columns = [
    { title: "入仓单号", dataIndex: "单号", width: 150 },
    { title: "供应商", dataIndex: "供应商名称", width: 160 },
    { title: "仓库", dataIndex: "仓库", width: 90 },
    { title: "数量", dataIndex: "数量", width: 80 },
    { title: "日期", dataIndex: "日期", width: 110, render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", width: 80, render: () => <Tag color="green">已审核</Tag> },
  ];
  return (
    <Modal title="选择塑胶入仓单（仅已审核）" open={open} onCancel={onClose} footer={null} width={760}>
      <Input.Search placeholder="单号/供应商" allowClear style={{ width: 240, marginBottom: 12 }}
        value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} />
      <Table size="small" rowKey="id" loading={loading} dataSource={rows} columns={columns}
        scroll={{ y: 360 }} pagination={false}
        onRow={r => ({ onClick: () => { onPick(r.单号 ?? ""); onClose(); }, style: { cursor: "pointer" } })} />
    </Modal>
  );
}
