import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table } from "antd";
import { plasticMoldApi, type PlasticMoldRow } from "../../api/plasticMold";

// 工模选择器:可搜索工模表,点行返回该工模(塑胶共用物料表编辑联动用)。
export default function PlasticMoldPicker({ open, onPick, onClose }: {
  open: boolean;
  onPick: (row: PlasticMoldRow) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<PlasticMoldRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await plasticMoldApi.list(p, 50, keyword.trim());
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载工模表失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setPage(1); load(1); } }, [open]);
  useEffect(() => { if (!open) { setKeyword(""); setPage(1); setRows([]); } }, [open]);

  const search = () => { setPage(1); load(1); };

  const columns = [
    { title: "工模编号", dataIndex: "工模编号", width: 110 },
    { title: "工模名称", dataIndex: "工模名称", width: 150 },
    { title: "颜色", dataIndex: "颜色", width: 110 },
    { title: "色粉号", dataIndex: "色粉号", width: 90 },
    { title: "用料名称", dataIndex: "用料名称", width: 110 },
    { title: "整啤模腔数", dataIndex: "整啤模腔数", width: 100, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "啤机机型", dataIndex: "啤机机型", width: 90 },
  ];

  return (
    <Modal title="选择工模" open={open} onCancel={onClose} footer={null} width={860}>
      <div style={{ marginBottom: 12 }}>
        <Input.Search
          placeholder="工模编号/名称/颜色/用料" allowClear style={{ width: 280 }}
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
