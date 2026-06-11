import { useCallback, useEffect, useState } from "react";
import { Card, Checkbox, DatePicker, Input, Space, Table, Tag, message } from "antd";
import type { Dayjs } from "dayjs";
import { purchaseOrderApi, type PurchaseOrderProgressRow } from "../../api/purchaseOrders";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PurchaseOrderDrawer from "./PurchaseOrderDrawer";

const MENU = "采购订单";
const d10 = (v?: string) => v?.slice(0, 10);

export default function OrderProgressPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [供应商, set供应商] = useState("");
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [onlyOwed, setOnlyOwed] = useState(false);
  const [rows, setRows] = useState<PurchaseOrderProgressRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await purchaseOrderApi.progress({
        供应商: 供应商.trim() || undefined,
        keyword: keyword.trim() || undefined,
        起: range?.[0] ? range[0].format("YYYY-MM-DD") : undefined,
        止: range?.[1] ? range[1].format("YYYY-MM-DD") : undefined,
        onlyOwed: onlyOwed || undefined,
      });
      setRows(r);
    } catch { message.error("加载订单进度表失败"); }
    finally { setLoading(false); }
  }, [canOpen, 供应商, keyword, range, onlyOwed]);

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  const num = (v?: number | null) => (v ?? 0);
  const owe = (v?: number | null) => (
    <span style={{ fontWeight: 700, color: (v ?? 0) > 0 ? "#cf1322" : undefined }}>{v ?? 0}</span>
  );

  const columns = [
    { title: "订购日期", dataIndex: "订购日期", width: 110, render: d10 },
    { title: "交货日期", dataIndex: "交货日期", width: 110, render: d10 },
    { title: "采购单号", dataIndex: "采购单号", width: 140, render: (v: string) => <a className="erp-num">{v}</a> },
    { title: "生产单号", dataIndex: "生产单号", width: 130 },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称", width: 150 },
    { title: "材料", dataIndex: "物料类别", width: 90 },
    { title: "规格", dataIndex: "规格", width: 100 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "订购数量", dataIndex: "订购数量", width: 90, align: "right" as const, render: num },
    { title: "入仓数量", dataIndex: "入仓数量", width: 90, align: "right" as const, render: num },
    { title: "欠数", dataIndex: "欠数", width: 90, align: "right" as const, render: owe },
    { title: "供应商", dataIndex: "供应商名称", width: 160 },
    { title: "操作员", dataIndex: "操作员", width: 90 },
    { title: "审核", dataIndex: "审核", width: 90, align: "center" as const, render: 审核Tag },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少"采购订单·打开"权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="订单进度表" variant="borderless">
      <Space wrap style={{ marginBottom: 12 }}>
        <Input placeholder="供应商" allowClear style={{ width: 160 }}
          value={供应商} onChange={e => set供应商(e.target.value)} />
        <DatePicker.RangePicker value={range as never}
          onChange={v => setRange(v as [Dayjs | null, Dayjs | null] | null)} />
        <Input.Search placeholder="生产单号/款号/物料" allowClear style={{ width: 220 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} />
        <Checkbox checked={onlyOwed} onChange={e => setOnlyOwed(e.target.checked)}>只看欠数</Checkbox>
      </Space>
      <Table
        size="small" rowKey={(_, i) => String(i)} loading={loading} dataSource={rows}
        columns={columns} scroll={{ x: true }}
        pagination={{ pageSize: 50, showSizeChanger: false, showTotal: t => `共 ${t} 条` }}
        onRow={r => ({ onClick: () => r.采购单号 && setViewing(r.采购单号), style: { cursor: "pointer" } })}
      />
      <PurchaseOrderDrawer
        open={!!viewing}
        单号={viewing}
        onClose={() => setViewing(undefined)}
      />
    </Card>
  );
}
