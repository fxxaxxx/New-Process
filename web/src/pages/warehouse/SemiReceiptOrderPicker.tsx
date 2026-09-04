import { useEffect, useState } from "react";
import { Input, Modal, Table, Tag, message } from "antd";
import { semiReceiptApi, type SRHeader } from "../../api/semi";
import { useAutoReload } from "../../hooks/useAutoReload";

export default function SemiReceiptOrderPicker({ open, onPick, onClose }: { open: boolean; onPick: (documentNo: string) => void; onClose: () => void }) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<SRHeader[]>([]);
  const [loading, setLoading] = useState(false);
  const load = async (silent = false) => {
    setLoading(true);
    try { setRows((await semiReceiptApi.list(1, 100, keyword.trim())).items ?? []); }
    catch { if (!silent) message.error("加载半成品入仓单失败"); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) void load(); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  // 弹窗打开期间,切回本页/窗口聚焦/30秒轮询 自动刷新列表;silent 失败不弹 toast
  useAutoReload(() => { if (open) void load(true); });
  return <Modal title="打开半成品入仓单" open={open} onCancel={onClose} footer={null} width={900}>
    <Input.Search allowClear value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={() => void load()} placeholder="单号 / 订单单号 / 供应商" style={{ width: 320, marginBottom: 12 }} />
    <Table<SRHeader> size="small" loading={loading} rowKey={row => row.单号 ?? String(row.id)} dataSource={rows} pagination={false} scroll={{ y: 440 }}
      columns={[
        { title: "电脑单号", dataIndex: "单号", width: 150 }, { title: "日期", dataIndex: "日期", width: 120, render: v => v?.slice(0, 10) },
        { title: "订单单号", dataIndex: "订单单号", width: 150 }, { title: "供应商", dataIndex: "供应商名称", width: 200 },
        { title: "仓库", dataIndex: "仓库", width: 120 }, { title: "数量", dataIndex: "数量", width: 100, align: "right" },
        { title: "状态", dataIndex: "审核", width: 90, render: v => <Tag color={v === "1" ? "success" : "default"}>{v === "1" ? "已审核" : "未审核"}</Tag> },
      ]}
      onRow={row => ({ onDoubleClick: () => row.单号 && onPick(row.单号), style: { cursor: "pointer" } })} />
  </Modal>;
}
