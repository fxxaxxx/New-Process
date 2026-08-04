import { useCallback, useEffect, useState } from "react";
import { Button, Card, DatePicker, Input, Select, Space, Table, Tag, message } from "antd";
import type { Dayjs } from "dayjs";
import { purchaseOrderApi, type PurchaseOrderProgressDetailRow } from "../../api/purchaseOrders";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PurchaseOrderDrawer from "./PurchaseOrderDrawer";

const MENU = "采购订单";
const d10 = (v?: string | null) => v?.slice(0, 10);

export default function ProgressDetailPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  const [供应商, set供应商] = useState("");
  const [keyword, setKeyword] = useState("");
  const [range, setRange] = useState<[Dayjs | null, Dayjs | null] | null>(null);
  const [状态, set状态] = useState<string>("全部");
  const [rows, setRows] = useState<PurchaseOrderProgressDetailRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<string | undefined>(undefined);

  const load = useCallback(async () => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await purchaseOrderApi.progressDetail({
        供应商: 供应商.trim() || undefined,
        keyword: keyword.trim() || undefined,
        起: range?.[0] ? range[0].format("YYYY-MM-DD") : undefined,
        止: range?.[1] ? range[1].format("YYYY-MM-DD") : undefined,
        状态: 状态 === "全部" ? undefined : 状态,
      });
      setRows(r);
    } catch { message.error("加载进度明细表失败"); }
    finally { setLoading(false); }
  }, [canOpen, 供应商, keyword, range, 状态]);

  // 仅首屏加载一次；之后由「查询」按钮 / 搜索框显式触发，故意不随筛选变化自动刷新
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  const num = (v?: number | null) => (v ?? 0);

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
    { title: "入仓单号", dataIndex: "入仓单号", width: 140, render: (v?: string | null) => v ?? "" },
    { title: "入仓数量", dataIndex: "入仓数量", width: 90, align: "right" as const, render: (v?: number | null) => v ?? "" },
    { title: "入仓日期", dataIndex: "入仓日期", width: 110, render: d10 },
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
    <Card title="进度明细表" variant="borderless">
      <Space wrap style={{ marginBottom: 12 }}>
        <Input placeholder="供应商" allowClear style={{ width: 160 }}
          value={供应商} onChange={e => set供应商(e.target.value)} onPressEnter={load} />
        <DatePicker.RangePicker value={range}
          onChange={v => setRange(v as [Dayjs | null, Dayjs | null] | null)} />
        <Input.Search placeholder="生产单号/款号/物料" allowClear style={{ width: 220 }}
          value={keyword} onChange={e => setKeyword(e.target.value)} onSearch={load} />
        <Select value={状态} style={{ width: 120 }} onChange={set状态}
          options={[{ value: "全部", label: "全部" }, { value: "已入仓", label: "已入仓" }, { value: "未入仓", label: "未入仓" }]} />
        <Button type="primary" onClick={load}>查询</Button>
      </Space>
      <Table
        size="small" rowKey={(_, i) => String(i)} loading={loading} dataSource={rows}
        columns={columns} scroll={{ x: "max-content", y: "calc(100vh - 300px)" }}
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
