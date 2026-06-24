import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, DatePicker, Input, Space, Table, Tabs, Tree, message } from "antd";
import type { Dayjs } from "dayjs";
import {
  purchaseOrderApi,
  type PurchaseOrderQueryDetailRow,
  type PurchaseOrderQuerySummaryRow,
} from "../../api/purchaseOrders";
import { materialMasterApi, type MaterialCategoryNode } from "../../api/materialMaster";
import { hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import { ALL_CAT as ALL, buildOrderQuery } from "../../utils/purchaseOrderQuery";
import PurchaseOrderDrawer from "./PurchaseOrderDrawer";

const MENU = "采购订单";

export default function PurchaseOrderQueryPage() {
  const perms = usePerms();
  const priceHidden = hidePrice(perms, MENU);

  const [tab, setTab] = useState<"detail" | "summary">("detail");
  const [cats, setCats] = useState<MaterialCategoryNode[]>([]);
  const [selKey, setSelKey] = useState<string>(ALL);
  const [供应商, set供应商] = useState("");
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);

  const [detail, setDetail] = useState<PurchaseOrderQueryDetailRow[]>([]);
  const [summary, setSummary] = useState<PurchaseOrderQuerySummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<string | undefined>(undefined);

  const query = useMemo(() => buildOrderQuery({
    供应商, keyword, selKey,
    起: range?.[0]?.format("YYYY-MM-DD"),
    止: range?.[1]?.format("YYYY-MM-DD"),
  }), [供应商, keyword, selKey, range]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "detail") setDetail(await purchaseOrderApi.orderQueryDetail(query));
      else setSummary(await purchaseOrderApi.orderQuerySummary(query));
    } catch { message.error("加载订购单查询失败"); }
    finally { setLoading(false); }
  }, [tab, query]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    materialMasterApi.categories().then(setCats).catch(() => { /* 树取数失败不阻塞主表 */ });
  }, []);

  const treeData = useMemo(() => [{
    title: "全部物料", key: ALL,
    children: cats.map(c => ({ title: `${c.类别}（${c.数量}）`, key: c.类别 ?? "", isLeaf: true })),
  }], [cats]);

  const num = (v?: string) => <span className="erp-num">{v}</span>;

  const detailColumns = [
    { title: "日期", dataIndex: "日期", render: (v?: string) => v?.slice(0, 10) },
    { title: "单号", dataIndex: "单号", render: num },
    { title: "供应商", dataIndex: "供应商名称" },
    { title: "生产单号", dataIndex: "生产单号" },
    { title: "款号", dataIndex: "款号" },
    { title: "物料编号", dataIndex: "物料编号", render: num },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格" },
    { title: "材料", dataIndex: "物料类别" },
    { title: "颜色", dataIndex: "颜色" },
    { title: "单位", dataIndex: "单位" },
    { title: "数量", dataIndex: "数量", align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "单价", dataIndex: "单价", align: "right" as const },
      { title: "金额", dataIndex: "金额", align: "right" as const },
    ]),
    { title: "审核", dataIndex: "审核", render: (v?: string) => (v === "1" ? "已审核" : "未审核") },
    { title: "备注", dataIndex: "备注" },
  ];

  const summaryColumns = [
    { title: "物料编号", dataIndex: "物料编号", render: num },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "材料", dataIndex: "物料类别" },
    { title: "规格", dataIndex: "规格" },
    { title: "颜色", dataIndex: "颜色" },
    { title: "单位", dataIndex: "单位" },
    { title: "订购数量", dataIndex: "订购数量", align: "right" as const,
      render: (v: number) => <span style={{ fontWeight: 600 }}>{v}</span> },
  ];

  return (
    <Card title="订购单查询" variant="borderless" styles={{ body: { display: "flex", gap: 12 } }}>
      <div style={{ width: 220, flex: "0 0 220px", borderRight: "1px solid #f0f0f0", paddingRight: 8 }}>
        <Tree treeData={treeData} selectedKeys={[selKey]} defaultExpandAll
          onSelect={keys => { if (keys.length) setSelKey(String(keys[0])); }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Space style={{ marginBottom: 12 }} wrap>
          <DatePicker.RangePicker value={range ?? undefined}
            onChange={v => setRange(v as [Dayjs | null, Dayjs | null] | null)} />
          <Input placeholder="供应商" allowClear value={供应商}
            onChange={e => set供应商(e.target.value)} style={{ width: 160 }} />
          <Input.Search placeholder="物料编号/名称/规格" allowClear onSearch={setKeyword} style={{ width: 220 }} />
          <Button type="primary" onClick={load}>查询</Button>
        </Space>
        <Tabs activeKey={tab} onChange={k => setTab(k as "detail" | "summary")}
          items={[
            {
              key: "detail", label: "明细查询",
              children: (
                <Table rowKey={(_, i) => `d${i}`} size="small" loading={loading}
                  dataSource={detail} columns={detailColumns} scroll={{ x: true }}
                  pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }}
                  onRow={r => ({
                    onDoubleClick: () => r.单号 && setViewing(r.单号),
                    style: { cursor: "pointer" },
                  })} />
              ),
            },
            {
              key: "summary", label: "汇总查询",
              children: (
                <Table rowKey={(_, i) => `s${i}`} size="small" loading={loading}
                  dataSource={summary} columns={summaryColumns} scroll={{ x: true }}
                  pagination={{ pageSize: 20, showTotal: t => `共 ${t} 条` }} />
              ),
            },
          ]} />
      </div>
      <PurchaseOrderDrawer
        open={!!viewing}
        单号={viewing}
        onClose={() => setViewing(undefined)}
      />
    </Card>
  );
}
