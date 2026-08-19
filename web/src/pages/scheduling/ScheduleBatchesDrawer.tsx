// 排期导入批次管理抽屉:批次列表 + 删除(级联删明细)
import { useCallback, useEffect, useState } from "react";
import { Drawer, Popconfirm, Table, message } from "antd";
import { schedulingApi, type ScheduleBatch } from "../../api/scheduling";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产排期";

export default function ScheduleBatchesDrawer({ open, onClose, onChanged }: {
  open: boolean; onClose: () => void; onChanged: () => void;
}) {
  const perms = usePerms();
  const [rows, setRows] = useState<ScheduleBatch[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try { setRows(await schedulingApi.batches()); }
    catch { message.error("加载导入批次失败"); }
    finally { setLoading(false); }
  }, [open]);
  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    try { await schedulingApi.removeBatch(id); message.success("批次已删除"); load(); onChanged(); }
    catch { message.error("删除失败"); }
  };

  const columns = [
    { title: "批次", dataIndex: "ID", width: 70 },
    { title: "排期客户", dataIndex: "排期客户", width: 110 },
    { title: "文件名", dataIndex: "文件名", ellipsis: true },
    { title: "导入时间", dataIndex: "导入日期", width: 150, render: (v?: string) => v?.replace("T", " ").slice(0, 19) },
    { title: "行数", dataIndex: "行数", width: 70, align: "right" as const },
    { title: "新增", dataIndex: "新增", width: 60, align: "right" as const },
    { title: "更新", dataIndex: "更新", width: 60, align: "right" as const },
    { title: "操作员", dataIndex: "操作员", width: 80 },
    {
      title: "操作", key: "_op", width: 70,
      render: (_: unknown, row: ScheduleBatch) => can(perms, MENU, "删除") && (
        <Popconfirm title={`删除批次 #${row.ID} 及其全部 ${row.行数} 行排期?`} onConfirm={() => remove(row.ID)}>
          <a>删除</a>
        </Popconfirm>
      ),
    },
  ];

  return (
    <Drawer title="排期导入批次" open={open} onClose={onClose} width={860}>
      <Table rowKey="ID" size="small" loading={loading} dataSource={rows} columns={columns}
        pagination={false} scroll={{ y: "calc(100vh - 160px)" }} />
    </Drawer>
  );
}
