import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table } from "antd";
import { masterApi } from "../../api/master";

export interface FactoryRow { 加工厂编号?: string; 加工厂名称?: string }

// 加工厂选择器:搜加工厂资料,点行返回 编号+名称。
export default function FactoryPicker({ open, onPick, onClose }: {
  open: boolean; onPick: (row: FactoryRow) => void; onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<FactoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await masterApi("factories").list(1, 200, keyword.trim())).items as FactoryRow[]); }
    catch { message.error("加载加工厂资料失败"); }
    finally { setLoading(false); }
  }, [keyword]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) load(); }, [open]);

  const columns = [
    { title: "加工厂编号", dataIndex: "加工厂编号", width: 130 },
    { title: "加工厂名称", dataIndex: "加工厂名称", width: 220 },
  ];
  return (
    <Modal title="选择加工厂" open={open} onCancel={onClose} footer={null} width={560}>
      <Input.Search placeholder="编号/名称" allowClear style={{ width: 220, marginBottom: 12 }}
        value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} />
      <Table size="small" rowKey={(_, i) => String(i)} loading={loading} dataSource={rows} columns={columns}
        scroll={{ y: 360 }} pagination={false}
        onRow={r => ({ onClick: () => { onPick(r); onClose(); }, style: { cursor: "pointer" } })} />
    </Modal>
  );
}
