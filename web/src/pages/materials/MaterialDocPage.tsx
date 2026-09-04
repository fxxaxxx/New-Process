import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, Card, Input, Popconfirm, Space, Table, Tag, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { materialDocApi, type MaterialDocHeader } from "../../api/materialDocs";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import type { MaterialDocCfg } from "./materialDocConfigs";
import MaterialDocCreateDrawer from "./MaterialDocCreateDrawer";
import MaterialDocDetailDrawer from "./MaterialDocDetailDrawer";
import MaterialIssueOutboundDrawer from "./MaterialIssueOutboundDrawer";
import { buildCopyInitial } from "../../utils/materialDocCopy";
import { useAutoReload } from "../../hooks/useAutoReload";

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
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]); // 勾选的单据 id
  const [batchApproving, setBatchApproving] = useState(false);          // 批量审核中
  const [searchParams, setSearchParams] = useSearchParams();
  const [basis, setBasis] = useState<string>();                         // 下推领料带过来的生产单号
  const [outboundNo, setOutboundNo] = useState<string | null>(null); // 分次出库中的领料单号

  // 下推入口：URL 带 ?basis=生产单号 时自动打开新建抽屉并带入应领明细（从生产通知单「下推领料」跳入）
  useEffect(() => {
    const b = searchParams.get("basis");
    if (!b || !cfg.usageCols) return;
    setCopyInitial(null);
    setBasis(b);
    setCreating(true);
    setSearchParams({}, { replace: true });   // 先清参数，避免刷新/返回重复带入
  }, [searchParams, cfg.usageCols, setSearchParams]);

  const load = useCallback(async (silent = false) => {
    try { const r = await dapi.list(page, 10, keyword); setRows(r.items); setTotal(r.total); }
    catch { if (!silent) message.error("加载列表失败"); }
  }, [page, keyword, dapi]);
  useEffect(() => { load(); }, [load]);
  // 切回本页/窗口聚焦/30秒轮询 自动刷新;silent 失败不弹 toast,避免后端异常时刷屏
  useAutoReload(() => { void load(true); });

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); message.success(ok); load(); }
    catch (e) { message.error((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "操作失败"); }
  };

  // 批量审核:只对勾选的未审核单逐张调审核接口,汇总成功/失败后刷新列表
  const batchApprove = async () => {
    const targets = rows.filter(r => selectedRowKeys.includes(r.id) && r.审核 !== "1");
    if (targets.length === 0) { message.info("勾选的单据均已审核"); return; }
    setBatchApproving(true);
    let ok = 0; const fails: string[] = [];
    for (const r of targets) {
      try { await dapi.approve(r.单号!); ok++; }
      catch (e) { fails.push((e as { response?: { data?: { 消息?: string } } }).response?.data?.消息 ?? "审核失败"); }
    }
    setBatchApproving(false);
    setSelectedRowKeys([]);
    if (fails.length === 0) message.success(`已审核 ${ok} 张`);
    else message.warning(`已审核 ${ok} 张,失败 ${fails.length} 张(${fails[0]})`);
    load();
  };

  const columns = [
    { title: "单号", dataIndex: "单号", key: "单号", render: (v: string) => <a className="erp-num" onClick={() => setViewing(v)}>{v}</a> },
    { title: "日期", dataIndex: "日期", key: "日期", render: (v?: string) => v?.slice(0, 10) },
    ...cfg.listExtra.map(f => ({ title: f.label, dataIndex: f.name, key: f.name })),
    { title: "数量", dataIndex: "数量", key: "数量" },
    { title: "金额", dataIndex: "金额", key: "金额", render: (v?: number | null) => (v == null ? "***" : v) },
    {
      title: "状态", dataIndex: "审核", key: "审核",
      render: (v: string | undefined, row: MaterialDocHeader) =>
        // 领料单(三级审批流):按流转状态显示;其他单据保持 已审核/未审核
        cfg.outbound
          ? v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>出库完成</Tag>
            : row.经理审核 === "1" ? <Tag color="blue" style={{ borderRadius: 6 }}>待出库</Tag>
            : row.主管审核 === "1" ? <Tag color="gold" style={{ borderRadius: 6 }}>待经理审核</Tag>
            : <Tag style={{ borderRadius: 6 }}>待主管审核</Tag>
          : v === "1" ? <Tag color="green" style={{ borderRadius: 6 }}>已审核</Tag> : null,
    },
    {
      title: "操作", key: "_op",
      render: (_: unknown, row: MaterialDocHeader) => (
        <Space>
          {cfg.outbound ? (
            // 领料单:三级审批(主管→经理→出库),不暴露整单「审核」入口
            <>
              {row.审核 !== "1" && row.主管审核 !== "1" && can(perms, cfg.menu, "审核") && (
                <a onClick={() => act(() => dapi.supervisorApprove(row.单号!), "主管已审核")}>主管审核</a>
              )}
              {row.主管审核 === "1" && row.经理审核 !== "1" && can(perms, cfg.menu, "审核") && (
                <a onClick={() => act(() => dapi.managerApprove(row.单号!), "经理已审核")}>经理审核</a>
              )}
              {row.经理审核 === "1" && row.审核 !== "1" && can(perms, cfg.menu, "审核") && (
                <a onClick={() => setOutboundNo(row.单号!)}>出库</a>
              )}
            </>
          ) : (
            row.审核 !== "1" && can(perms, cfg.menu, "审核") && <a onClick={() => act(() => dapi.approve(row.单号!), "已审核")}>审核</a>
          )}
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
          {!cfg.outbound && can(perms, cfg.menu, "审核") && (
            <Button loading={batchApproving} disabled={selectedRowKeys.length === 0} onClick={batchApprove}>批量审核</Button>
          )}
          {can(perms, cfg.menu, "保存") && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setCopyInitial(null); setCreating(true); }}>新建{cfg.title}单</Button>}
        </Space>
      }>
      <Table rowKey="id" size="middle" dataSource={rows} columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
        rowSelection={{ selectedRowKeys, onChange: ks => setSelectedRowKeys(ks as number[]) }}
        pagination={{ current: page, pageSize: 10, total, onChange: setPage, showTotal: t => `共 ${t} 条` }} />
      <MaterialDocCreateDrawer cfg={cfg} open={creating} initial={copyInitial ?? undefined} basis={basis}
        onClose={() => { setCreating(false); setCopyInitial(null); setBasis(undefined); }} onCreated={load} />
      <MaterialDocDetailDrawer cfg={cfg} 单号={viewing} onClose={() => setViewing(null)}
        onCopy={detail => { setCopyInitial(buildCopyInitial(cfg.headerFields, detail)); setViewing(null); setCreating(true); }} />
      {cfg.outbound && (
        <MaterialIssueOutboundDrawer 单号={outboundNo} open={outboundNo !== null}
          onClose={() => setOutboundNo(null)} onDone={load} />
      )}
    </Card>
  );
}
