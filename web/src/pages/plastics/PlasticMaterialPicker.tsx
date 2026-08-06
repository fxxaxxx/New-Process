import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table } from "antd";
import { plasticMaterialMasterApi, type PlasticMaterialRow } from "../../api/plasticMaterialMaster";

// 塑胶物料选择器:可搜索 P0 塑胶物料资料,点行返回该物料。
export default function PlasticMaterialPicker({ open, onPick, onClose }: {
  open: boolean;
  onPick: (row: PlasticMaterialRow) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticMaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await plasticMaterialMasterApi.list(undefined, keyword.trim() || undefined, p, 50);
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载塑胶物料列表失败"); }
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
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "仓位号", dataIndex: "仓位号", width: 90 },
    { title: "单位", dataIndex: "单位", width: 60 },
  ];

  return (
    <Modal title="选择塑胶物料" open={open} onCancel={onClose} footer={null} width={820}>
      <div style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="物料编号/名称/规格/颜色" allowClear style={{ width: 280 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={search}
        />
      </div>
      <Table
        size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns} scroll={{ x: true, y: 380 }}
        pagination={{ current: page, pageSize: 50, total, showSizeChanger: false,
          onChange: p => { setPage(p); load(p); }, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onClick: () => { onPick(r); onClose(); }, style: { cursor: "pointer" } })}
      />
    </Modal>
  );
}
