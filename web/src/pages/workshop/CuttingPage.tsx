import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { cuttingsApi, type CuttingHeader } from "../../api/cuttings";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import CuttingCreateDrawer from "./CuttingCreateDrawer";
import CuttingDetailDrawer from "./CuttingDetailDrawer";

const MENU = "裁床单";

export default function CuttingPage() {
  const perms = usePerms();
  const [rows, setRows] = useState<CuttingHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await cuttingsApi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { message.error("加载裁床单失败"); }
  }, [page, keyword]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const columns = [
    { title: "裁床单号", dataIndex: "裁床单号", key: "裁床单号", render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "生产单号", dataIndex: "生产单号", key: "生产单号", render: (v?: string) => v && <span className="erp-num">{v}</span> },
    { title: "款号", dataIndex: "款号", key: "款号" },
    { title: "床号", dataIndex: "床号", key: "床号" },
    { title: "裁床数量", dataIndex: "裁床数量", key: "裁床数量" },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag> },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: CuttingHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, MENU, "审核") && <a onClick={() => act(() => cuttingsApi.approve(row.裁床单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, MENU, "反审核") && <a onClick={() => act(() => cuttingsApi.unapprove(row.裁床单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, MENU, "删除") && (
            <Popconfirm title="确认删除该裁床单?" onConfirm={() => act(() => cuttingsApi.remove(row.裁床单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title="裁床单" variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索裁床单号/生产单号/款号" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 260 }} />
          {can(perms, MENU, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建裁床单</Button>}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns} scroll={{ x: true }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <CuttingCreateDrawer open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <CuttingDetailDrawer 裁床单号={viewing} onClose={() => setViewing(null)} />
    </Card>
  );
}
