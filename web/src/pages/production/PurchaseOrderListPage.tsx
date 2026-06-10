import { useCallback, useEffect, useState } from "react";
import { Card, Input, Table, Tag, message } from "antd";
import { purchaseOrderApi, type PurchaseOrderHeader } from "../../api/purchaseOrders";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PurchaseOrderDrawer from "./PurchaseOrderDrawer";

const MENU = "采购订单";
const PAGE_SIZE = 20;
const d10 = (v?: string) => v?.slice(0, 10);

export default function PurchaseOrderListPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<PurchaseOrderHeader[]>([]);
  const [loading, setLoading] = useState(false);

  const [viewing, setViewing] = useState<string | undefined>(undefined);

  const load = useCallback(async (p: number, kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await purchaseOrderApi.list(p, PAGE_SIZE, kw);
      setRows(r.items);
      setTotal(r.total);
    } catch { message.error("加载采购订单列表失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(page, keyword); }, [load, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (v: string) => {
    setKeyword(v);
    if (page === 1) load(1, v);
    else setPage(1);
  };

  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  const columns = [
    {
      title: "单号", dataIndex: "单号", width: 150,
      render: (v: string) => <a className="erp-num">{v}</a>,
    },
    { title: "日期", dataIndex: "日期", width: 110, render: d10 },
    { title: "供应商名称", dataIndex: "供应商名称", width: 180 },
    { title: "生产单号", dataIndex: "生产单号", width: 140 },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" as const },
    { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: money },
    { title: "审核", dataIndex: "审核", width: 90, align: "center" as const, render: 审核Tag },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“采购订单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="采购订单" variant="borderless"
      extra={
        <Input.Search
          placeholder="单号 / 供应商 / 生产单号" allowClear style={{ width: 260 }}
          onSearch={onSearch}
        />
      }>
      <Table
        size="middle" rowKey="ID" loading={loading} dataSource={rows}
        columns={columns} scroll={{ x: true }}
        pagination={{
          current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false,
          onChange: setPage,
          showTotal: t => `共 ${t} 条`,
        }}
        onRow={r => ({ onClick: () => setViewing(r.单号), style: { cursor: "pointer" } })}
      />

      <PurchaseOrderDrawer
        open={!!viewing}
        单号={viewing}
        onClose={() => setViewing(undefined)}
        onSaved={() => load(page, keyword)}
      />
    </Card>
  );
}
