import { useCallback, useEffect, useState } from "react";
import { Checkbox, Input, Modal, Table } from "antd";
import { materialMasterApi, type MaterialRow } from "../../api/materialMaster";

// 物料选择器：可搜索物料资料列表(复用 /api/material-master)，点行返回该物料。
export default function MaterialPicker({ open, hidePriceCols, onPick, onClose }: {
  open: boolean;
  hidePriceCols?: boolean;
  onPick: (row: MaterialRow) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [onlyStock, setOnlyStock] = useState(false);
  const [rows, setRows] = useState<MaterialRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const r = await materialMasterApi.list(undefined, keyword.trim() || undefined, p, 50, onlyStock || undefined);
      setRows(r.items); setTotal(r.total);
    } catch { /* 忽略 */ }
    finally { setLoading(false); }
  }, [keyword, onlyStock]);

  // 打开 / 切换只查有库存 时重查(回第1页)；关键字由搜索框显式触发
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) { setPage(1); load(1); } }, [open, onlyStock]);

  const search = () => { setPage(1); load(1); };

  const columns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "材料", dataIndex: "物料类别", width: 90 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 60 },
    { title: "库存", dataIndex: "库存", width: 80, align: "right" as const, render: (v?: number | null) => v ?? "" },
    ...(hidePriceCols ? [] : [
      { title: "单价", dataIndex: "单价", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    ]),
  ];

  return (
    <Modal title="选择物料" open={open} onCancel={onClose} footer={null} width={900}>
      <div style={{ marginBottom: 12, display: "flex", gap: 12, alignItems: "center" }}>
        <Input.Search
          placeholder="物料编号/名称/规格/颜色/供应商" allowClear style={{ width: 280 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={search}
        />
        <Checkbox checked={onlyStock} onChange={e => setOnlyStock(e.target.checked)}>只查有库存</Checkbox>
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
