import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table } from "antd";
import { plasticRawMaterialMasterApi, type PlasticRawMaterialRow } from "../../api/plasticRawMaterialMaster";

// 塑胶原料选择器:可搜索 塑胶原料资料,点行返回该原料。
export default function PlasticRawMaterialPicker({ open, onPick, onClose }: {
  open: boolean;
  onPick: (row: PlasticRawMaterialRow) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticRawMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await plasticRawMaterialMasterApi.list(undefined, keyword.trim() || undefined, p, 50);
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载塑胶原料列表失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setPage(1); load(1); } }, [open]);
  useEffect(() => { if (!open) { setKeyword(""); setPage(1); setRows([]); } }, [open]);

  const search = () => { setPage(1); load(1); };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "商品名称", dataIndex: "商品名称", width: 120 },
    { title: "单位", dataIndex: "单位", width: 60 },
  ];

  return (
    <Modal title="选择塑胶原料" open={open} onCancel={onClose} footer={null} width={820}>
      <div style={{ marginBottom: 12 }}>
        <Input.Search placeholder="物料编号/名称/规格/商品名称" allowClear style={{ width: 300 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={search} />
      </div>
      <Table size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns} scroll={{ x: true, y: 380 }}
        pagination={{ current: page, pageSize: 50, total, showSizeChanger: false,
          onChange: p => { setPage(p); load(p); }, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onClick: () => { onPick(r); onClose(); }, style: { cursor: "pointer" } })} />
    </Modal>
  );
}
