import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Table, Tag, message } from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { plasticMaterialDocApi, type PlasticOrderRow } from "../../api/plasticMaterialDoc";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PlasticMaterialDocDrawer from "./PlasticMaterialDocDrawer";

const MENU = "塑胶物料单";
const d10 = (v?: string) => v?.slice(0, 10);
const thisMonth = (): [Dayjs, Dayjs] => [dayjs().startOf("month"), dayjs().endOf("month")];

export default function PlasticMaterialAnalysisPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(thisMonth);
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<PlasticOrderRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [生产单号, set生产单号] = useState<string | undefined>(undefined);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const jumpMonth = (off: number) => {
    const b = dayjs().add(off, "month");
    setRange([b.startOf("month"), b.endOf("month")]);
  };
  const search = () => { setPage(1); load(1); };
  const openDrawer = (no?: string) => { if (no) { set生产单号(no); setDrawerOpen(true); } };

  const 审核Tag = (v?: string) => v === "1" ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;
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
