import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table } from "antd";
import { masterApi } from "../../api/master";

export interface SupplierRow { 供应商编号?: string; 供应商名称?: string }

// 供应商选择器:搜供应商资料,点行返回 编号+名称。
export default function SupplierPicker({ open, onPick, onClose }: {
  open: boolean; onPick: (row: SupplierRow) => void; onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await masterApi("suppliers").list(1, 200, keyword.trim())).items as SupplierRow[]); }
    catch { message.error("加载供应商资料失败"); }
    finally { setLoading(false); }
  }, [keyword]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) load(); }, [open]);

  const columns = [
    { title: "供应商编号", dataIndex: "供应商编号", width: 130 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 220 },
  ];
  return (
    <Modal title="选择供应商" open={open} onCancel={onClose} footer={null} width={560}>
      <Input.Search placeholder="编号/名称" allowClear style={{ width: 220, marginBottom: 12 }}
        value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} />
      <Table size="small" rowKey={(_, i) => String(i)} loading={loading} dataSource={rows} columns={columns}
        scroll={{ y: 360 }} pagination={false}
        onRow={r => ({ onClick: () => { onPick(r); onClose(); }, style: { cursor: "pointer" } })} />
    </Modal>
  );
}
