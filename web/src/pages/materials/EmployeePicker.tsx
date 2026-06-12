import { useCallback, useEffect, useState } from "react";
import { Input, message, Modal, Table } from "antd";
import { masterApi } from "../../api/master";

interface EmpRow { 编号?: string; 姓名?: string; 部门编号?: string; 职称?: string }

// 人事档案选择器：退料人/领料人 点🔍选人，点行返回姓名。
export default function EmployeePicker({ open, onPick, onClose }: {
  open: boolean;
  onPick: (姓名: string) => void;
  onClose: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [rows, setRows] = useState<EmpRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows((await masterApi("employees").list(1, 200, keyword.trim())).items as EmpRow[]);
    } catch { message.error("加载人事档案失败"); }
    finally { setLoading(false); }
  }, [keyword]);

  // 打开时重查；关键字由搜索框显式触发(onSearch)，故意不入依赖
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) load(); }, [open]);

  const columns = [
    { title: "编号", dataIndex: "编号", width: 90 },
    { title: "姓名", dataIndex: "姓名", width: 110 },
    { title: "部门", dataIndex: "部门编号", width: 110 },
    { title: "职称", dataIndex: "职称", width: 110 },
  ];

  return (
    <Modal title="选择人员（人事档案）" open={open} onCancel={onClose} footer={null} width={560}>
      <Input.Search
        placeholder="编号/姓名" allowClear style={{ width: 220, marginBottom: 12 }}
        value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load}
      />
      <Table
        size="small" rowKey={(_, i) => String(i)} loading={loading} dataSource={rows} columns={columns}
        scroll={{ y: 360 }} pagination={false}
        onRow={r => ({ onClick: () => { onPick(r.姓名 ?? ""); onClose(); }, style: { cursor: "pointer" } })}
      />
    </Modal>
  );
}
