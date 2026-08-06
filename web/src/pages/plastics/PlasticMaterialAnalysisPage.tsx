import { useCallback, useEffect, useState, type Key } from "react";
import { Button, Card, DatePicker, Input, InputNumber, Select, Space, Table, Tag, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { plasticMaterialDocApi, type PlasticOrderRow } from "../../api/plasticMaterialDoc";
import { plasticProcessDemandApi, type PlasticProcessDemandRow } from "../../api/plasticProcessDemand";
import { productionApi, type ProductionHeader } from "../../api/production";
import { masterApi } from "../../api/master";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PlasticMaterialDocDrawer from "./PlasticMaterialDocDrawer";

const MENU = "塑胶物料单";
const d10 = (v?: string) => v?.slice(0, 10);
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticMaterialAnalysisPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const canSave = can(perms, MENU, "保存");
  const priceHidden = hidePrice(perms, MENU);

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<PlasticOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [生产单号, set生产单号] = useState<string | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // 加工件发外需求区块
  interface Factory { 加工厂编号?: string; 加工厂名称?: string }
  // 需求行 + 每行手填的加工厂/单价
  type DemandRow = PlasticProcessDemandRow & { 加工厂编号?: string; 单价?: number | null };
  const [processOrders, setProcessOrders] = useState<ProductionHeader[]>([]); // 已审核生产通知单
  const [factories, setFactories] = useState<Factory[]>([]);
  const [需求单号, set需求单号] = useState<string | undefined>(undefined);
  const [demandRows, setDemandRows] = useState<DemandRow[]>([]);
  const [demandLoading, setDemandLoading] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([]);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (p: number) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await plasticMaterialDocApi.orders(
        range?.[0]?.format("YYYY-MM-DD"), range?.[1]?.format("YYYY-MM-DD"),
        keyword.trim() || undefined, p, 50);
      setRows(r.items); setTotal(r.total);
    } catch { message.error("加载生产单失败"); }
    finally { setLoading(false); }
  }, [canOpen, range, keyword]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(1); setPage(1); }, [canOpen]);

  // 加载已审核生产通知单（发外需求单号来源）和加工厂
  useEffect(() => {
    if (!canOpen) return;
    (async () => {
      try {
        const r = await productionApi.list(1, 200);
        setProcessOrders(r.items.filter(o => o.审核 === "1"));
        setFactories((await masterApi("factories").list(1, 500)).items as Factory[]);
      } catch { message.error("加载生产通知单/加工厂失败"); }
    })();
  }, [canOpen]);

  // 计算加工件发外需求
  const calcDemand = useCallback(async () => {
    if (!需求单号) { message.warning("请先选择生产单号"); return; }
    setDemandLoading(true);
    try {
      const rs = await plasticProcessDemandApi.demand(需求单号);
      setDemandRows(rs); setSelectedKeys([]);
    } catch { message.error("计算发外需求失败"); }
    finally { setDemandLoading(false); }
  }, [需求单号]);

  // 更新某行的加工厂/单价（rowKey 用行号）
  const setDemandRow = (i: number, patch: Partial<DemandRow>) =>
    setDemandRows(prev => prev.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // 生成加工采购单（仅提交勾选中需发数量>0 的行）
  const createOrders = async () => {
    if (!需求单号) return;
    const picked = demandRows.filter((_, i) => selectedKeys.includes(String(i)));
    const lines = picked.filter(r => Number(r.需发数量) > 0);
    if (lines.length === 0) { message.warning("请勾选需发数量大于 0 的行"); return; }
    const noFactory = lines.find(r => !r.加工厂编号);
    if (noFactory) { message.warning(`物料 ${noFactory.物料编号 ?? ""} 未选择加工厂`); return; }
    setCreating(true);
    try {
      const res = await plasticProcessDemandApi.createOrders(需求单号, lines.map(r => ({
        款号: r.款号, 物料编号: r.物料编号, 物料名称: r.物料名称, 颜色: r.颜色,
        工模编号: r.工模编号, 加工内容: r.加工内容, 加工次序: r.加工次序, 加工字母: r.加工字母,
        数量: Number(r.需发数量), 加工厂编号: String(r.加工厂编号),
        加工厂名称: factories.find(f => String(f.加工厂编号) === String(r.加工厂编号))?.加工厂名称,
        单价: r.单价 ?? null,
      })));
      message.success(`已生成加工采购单：${res.单号列表.join("、") || "无"}` +
        (res.跳过 > 0 ? `，跳过 ${res.跳过} 行（已有加工单）` : ""));
      await calcDemand(); // 成功后重新计算需求
    } catch { message.error("生成加工采购单失败"); }
    finally { setCreating(false); }
  };

  const jumpMonth = (off: number) => {
    const b = dayjs().add(off, "month");
    setRange([b.startOf("month"), b.endOf("month")]);
  };
  const search = () => { setPage(1); load(1); };
  const openDrawer = (no?: string) => { if (no) { set生产单号(no); setDrawerOpen(true); } };

  const 审核Tag = (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  // 加工件发外需求表格列
  const numCell = (v?: number | null) => v ?? 0;
  const demandColumns = [
    { title: "工模编号", dataIndex: "工模编号", width: 110 },
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 140 },
    { title: "颜色", dataIndex: "颜色", width: 90 },
    { title: "加工内容", dataIndex: "加工内容", width: 120 },
    { title: "加工次序", dataIndex: "加工次序", width: 90 },
    { title: "加工字母", dataIndex: "加工字母", width: 80 },
    { title: "需求量", dataIndex: "需求量", width: 90, align: "right" as const, render: numCell },
    { title: "白件库存", dataIndex: "白件库存", width: 90, align: "right" as const, render: numCell },
    { title: "已发未回", dataIndex: "已发未回", width: 90, align: "right" as const, render: numCell },
    { title: "需发数量", dataIndex: "需发数量", width: 100, align: "right" as const,
      render: (v?: number | null) => <b style={{ color: "#f5222d" }}>{v ?? 0}</b> },
    { title: "加工厂", key: "_factory", width: 200, render: (_: unknown, r: DemandRow, i: number) =>
      <Select showSearch allowClear optionFilterProp="label" style={{ width: 190 }} placeholder="加工厂"
        value={r.加工厂编号} onChange={(v?: string) => setDemandRow(i, { 加工厂编号: v })}
        options={factories.map(f => ({ value: String(f.加工厂编号), label: `${f.加工厂编号} ${f.加工厂名称 ?? ""}` }))} /> },
    ...(priceHidden ? [] : [
      { title: "单价", key: "_price", width: 110, render: (_: unknown, r: DemandRow, i: number) =>
        <InputNumber min={0} style={{ width: 100 }} value={r.单价 ?? undefined}
          onChange={(v) => setDemandRow(i, { 单价: v })} /> },
    ]),
  ];

  const columns = [
    { title: "制单日期", dataIndex: "日期", width: 110, render: d10 },
    { title: "交货日期", dataIndex: "交货日期", width: 110, render: d10 },
    { title: "生产单号", dataIndex: "生产单号", width: 140, render: (v: string) => <a className="erp-num">{v}</a> },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "款式", dataIndex: "款式", width: 140 },
    { title: "客户", dataIndex: "客户名称", width: 120 },
    { title: "合同号", dataIndex: "合同号", width: 110 },
    { title: "计划数量", dataIndex: "计划数量", width: 90, align: "right" as const },
    { title: "审核", dataIndex: "审核", width: 90, align: "center" as const, render: 审核Tag },
  ];

  if (!canOpen) {
    return <Card variant="borderless"><div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"塑胶物料单·打开"权限）。</div></Card>;
  }

  return (
    <Card title="塑胶采购分析" variant="borderless">
      {/* 加工件发外需求：按已审核生产通知单计算，可勾选生成加工采购单 */}
      <Card size="small" title="加工件发外需求" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <Select showSearch allowClear optionFilterProp="label" style={{ width: 280 }} placeholder="生产单号（已审核）"
            value={需求单号} onChange={(v?: string) => set需求单号(v)}
            options={processOrders.map(o => ({
              value: String(o.生产单号),
              label: `${o.生产单号} ${o.款号 ?? ""}/${o.客户名称 ?? ""}`,
            }))} />
          <Button type="primary" loading={demandLoading} onClick={calcDemand}>计算发外需求</Button>
          {canSave && (
            <Button type="primary" loading={creating} onClick={createOrders}
              disabled={selectedKeys.length === 0}>生成加工采购单</Button>
          )}
        </Space>
        <Table size="small" rowKey={(_, i) => String(i)} loading={demandLoading}
          dataSource={demandRows} columns={demandColumns} pagination={false}
          scroll={{ x: "max-content", y: 380 }}
          rowSelection={{ selectedRowKeys: selectedKeys, onChange: keys => setSelectedKeys(keys) }} />
      </Card>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button.Group>
          <Button onClick={() => jumpMonth(-1)}>上月</Button>
          <Button onClick={() => jumpMonth(0)}>本月</Button>
          <Button onClick={() => jumpMonth(1)}>下月</Button>
        </Button.Group>
        <DatePicker.RangePicker value={range ?? undefined}
          onChange={v => setRange(v as [Dayjs | null, Dayjs | null] | null)} />
        <Input.Search placeholder="生产单号/款号/款式/客户/合同号" allowClear style={{ width: 260 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={search} />
        <Button type="primary" onClick={search}>查询</Button>
      </Space>
      <Table
        size="small" rowKey="ID" loading={loading} dataSource={rows} columns={columns} scroll={{ x: 1100, y: "calc(100vh - 300px)" }}
        pagination={{ current: page, pageSize: 50, total, showSizeChanger: false,
          onChange: p => { setPage(p); load(p); }, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onClick: () => openDrawer(r.生产单号), style: { cursor: "pointer" } })}
      />
      <PlasticMaterialDocDrawer open={drawerOpen} 生产单号={生产单号}
        onClose={() => setDrawerOpen(false)} onSaved={() => load(page)} />
    </Card>
  );
}
