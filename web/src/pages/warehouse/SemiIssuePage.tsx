import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { semiIssueApi, type SIHeader } from "../../api/semi";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import SemiIssueCreateDrawer from "./SemiIssueCreateDrawer";

const MENU = "半成品领料";

export default function SemiIssuePage() {
  const perms = usePerms();
  const [rows, setRows] = useState<SIHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try { const r = await semiIssueApi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { message.error("加载半成品领料单失败"); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const columns = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <span className="erp-num">{v}</span> },
    { title: "仓库", dataIndex: "仓库", key: "仓库" },
    { title: "领料部门", dataIndex: "部门", key: "部门" },
    { title: "领料人", dataIndex: "领料人", key: "领料人" },
    { title: "领料数量", dataIndex: "数量", key: "数量" },
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: SIHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => semiIssueApi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => semiIssueApi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该领料单?" onConfirm={() => act(() => semiIssueApi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="半成品领料" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索单号/仓库/领料人" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 240 }} />
          {can(perms, MENU, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建领料单</Button>}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns} scroll={{ x: true }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <SemiIssueCreateDrawer open={creating} onClose={() => setCreating(false)} onCreated={load} />
    </Card>
  );
}
