import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { materialDocApi, type MaterialDocHeader } from "../../api/materialDocs";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import type { MaterialDocCfg } from "./materialDocConfigs";
import MaterialDocCreateDrawer from "./MaterialDocCreateDrawer";
import MaterialDocDetailDrawer from "./MaterialDocDetailDrawer";
import { buildCopyInitial } from "../../utils/materialDocCopy";

export default function MaterialDocPage({ cfg }: { cfg: MaterialDocCfg }) {
  const perms = usePerms();
  const dapi = useMemo(() => materialDocApi(cfg.resource), [cfg.resource]);
  const [rows, setRows] = useState<MaterialDocHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [copyInitial, setCopyInitial] = useState<ReturnType<typeof buildCopyInitial> | null>(null);

  const load = useCallback(async () => {
    try { const r = await dapi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { message.error("加载列表失败"); }
  }, [page, keyword, dapi]);
  useEffect(() => { load(); }, [load]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  const columns = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    ...cfg.listExtra.map(f => ({ title: f.label, dataIndex: f.name, key: f.name })),
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "金额", dataIndex: "金额", key: "金额", render: (v?: number | null) => (v == null ? "***" : v) },
    {
      title: "状态", dataIndex: "审核", key: "审核",
      render: (v?: string) => v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : <Tag style={{ borderRadius: 6 }}>未审核</Tag>,
    },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: MaterialDocHeader) => (
        <Space>
          {row.审核 !== "1" && can(perms, cfg.menu, "审核") && <a onClick={() => act(() => dapi.approve(row.单号!), "已审核")}>审核</a>}
          {row.审核 === "1" && can(perms, cfg.menu, "反审核") && <a onClick={() => act(() => dapi.unapprove(row.单号!), "已反审核")}>反审核</a>}
          {row.审核 !== "1" && can(perms, cfg.menu, "删除") && (
            <Popconfirm title="确认删除?" onConfirm={() => act(() => dapi.remove(row.单号!), "已删除")}><a>删除</a></Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card title={`${cfg.title}单`} variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索单号" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          {can(perms, cfg.menu, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCopyInitial(null); setCreating(true); }}>新建{cfg.title}单</Button>}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <MaterialDocCreateDrawer cfg={cfg} open={creating} initial={copyInitial ?? undefined}
        onClose={() => { setCreating(false); setCopyInitial(null); }} onCreated={load} />
      <MaterialDocDetailDrawer cfg={cfg} 单号={viewing} onClose={() => setViewing(null)}
        onCopy={detail => { setCopyInitial(buildCopyInitial(cfg.headerFields, detail)); setViewing(null); setCreating(true); }} />
    </Card>
  );
}
