import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { plasticDocApi, type PlasticDocHeader } from "../../../api/plasticDocs";
import { can } from "../../../auth/permissions";
import { usePerms } from "../../../auth/PermissionContext";
import type { PlasticDocCfg } from "./PlasticDocConfigs";
import PlasticDocCreateDrawer from "./PlasticDocCreateDrawer";
import PlasticDocDetailDrawer from "./PlasticDocDetailDrawer";

export default function PlasticDocPage({ cfg }: { cfg: PlasticDocCfg }) {
  const perms = usePerms();
  const dapi = useMemo(() => plasticDocApi(cfg.resource), [cfg.resource]);
  const [rows, setRows] = useState<PlasticDocHeader[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { const r = await dapi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { message.error("加载列表失败"); }
  }, [page, keyword, dapi]);
  useEffect(() => { load(); }, [load]);

  const columns = [
    { title: "单号", dataIndex: "单号", render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "日期", dataIndex: "日期", render: (v?: string) => v?.slice(0, 10) },
    ...cfg.listExtra.map(f => ({ title: f.label, dataIndex: f.name })),
    { title: "数量", dataIndex: "数量" },
    { title: "金额", dataIndex: "金额", render: (v?: number | null) => (v == null ? "***" : v) },
    { title: "状态", dataIndex: "审核", render: (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag> },
  ];

  if (!can(perms, cfg.menu, "打开")) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"{cfg.menu}·打开"权限）。</div></Card>;
  }

  return (
    <Card title={`${cfg.title}单`} variant="borderless"
      extra={
        <Space>
          <Input.Search placeholder="搜索单号/供应商" allowClear onSearch={v => { setPage(1); setKeyword(v); }} style={{ width: 220 }} />
          {can(perms, cfg.menu, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreating(true)}>新建{cfg.title}单</Button>}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns} scroll={{ x: true }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <PlasticDocCreateDrawer cfg={cfg} open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <PlasticDocDetailDrawer cfg={cfg} 单号={viewing} onClose={() => setViewing(null)} onChanged={load} />
    </Card>
  );
}
