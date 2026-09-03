import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table, Tabs } from "antd";
import { masterApi } from "../../api/master";

export interface SupplierRow { 供应商编号?: string; 供应商名称?: string }

// 供应商选择器:搜供应商资料,点行返回 编号+名称。
// withAssembly=true 时多一个「装配」页签(供应商资料中名称含“装配”的单位,如 装配部/兴信装配A车间),
// 供半成品入仓这类既可能来自装配也可能来自外发供应商的单据使用;装配单位也在供应商资料里,保证外键不报错。
export default function SupplierPicker({ open, onPick, onClose, withAssembly = false }: {
  open: boolean; onPick: (row: SupplierRow) => void; onClose: () => void; withAssembly?: boolean;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<SupplierRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [asmKeyword, setAsmKeyword] = useState("");
  const [asmRows, setAsmRows] = useState<SupplierRow[]>([]);
  const [asmLoading, setAsmLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await masterApi("suppliers").list(1, 200, keyword.trim())).items as SupplierRow[]); }
    catch { message.error("加载供应商资料失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  const loadAssembly = useCallback(async () => {
    setAsmLoading(true);
    try {
      const items = (await masterApi("suppliers").list(1, 500)).items as SupplierRow[];
      const kw = asmKeyword.trim();
      setAsmRows(items.filter(s => (s.供应商名称 ?? "").includes("装配")
        && (!kw || (s.供应商名称 ?? "").includes(kw) || (s.供应商编号 ?? "").includes(kw))));
    }
    catch { message.error("加载装配单位失败"); }
    finally { setAsmLoading(false); }
  }, [asmKeyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) load(); }, [open]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open && withAssembly) loadAssembly(); }, [open, withAssembly]);

  const supplierColumns = [
    { title: "供应商编号", dataIndex: "供应商编号", width: 130 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 220 },
  ];
  const pick = (r: SupplierRow) => { onPick(r); onClose(); };

  const supplierTable = (
    <>
      <Input.Search placeholder="编号/名称" allowClear style={{ width: 220, marginBottom: 12 }}
        value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} />
      <Table size="small" rowKey={(_, i) => String(i)} loading={loading} dataSource={rows} columns={supplierColumns}
        scroll={{ y: 360 }} pagination={false}
        onRow={r => ({ onClick: () => pick(r), style: { cursor: "pointer" } })} />
    </>
  );

  if (!withAssembly)
    return <Modal title="选择供应商" open={open} onCancel={onClose} footer={null} width={560}>{supplierTable}</Modal>;

  return (
    <Modal title="选择装配/供应商" open={open} onCancel={onClose} footer={null} width={560}>
      <Tabs items={[
        { key: "assembly", label: "装配", children: (
          <>
            <Input.Search placeholder="编号/名称" allowClear style={{ width: 220, marginBottom: 12 }}
              value={asmKeyword} onChange={e => setAsmKeyword(e.target.value)} onSearch={loadAssembly} />
            <Table size="small" rowKey={(_, i) => String(i)} loading={asmLoading} dataSource={asmRows} columns={supplierColumns}
              scroll={{ y: 360 }} pagination={false}
              onRow={r => ({ onClick: () => pick(r), style: { cursor: "pointer" } })} />
          </>
        ) },
        { key: "supplier", label: "供应商", children: supplierTable },
      ]} />
    </Modal>
  );
}
