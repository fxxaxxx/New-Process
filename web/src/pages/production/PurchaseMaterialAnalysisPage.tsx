import { useCallback, useEffect, useState } from "react";
import { Card, Input, Space, Table, Tag, message } from "antd";
import { productionApi, type ProductionHeader } from "../../api/production";
import { can } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";
import PurchaseOrderDrawer from "./PurchaseOrderDrawer";

const MENU = "生产制单";
const PAGE_SIZE = 50;
const d10 = (v?: string) => v?.slice(0, 10);

export default function PurchaseMaterialAnalysisPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");

  // 列表查询态
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<ProductionHeader[]>([]);
  const [loading, setLoading] = useState(false);

  // 采购物料单抽屉（新建模式：基于生产单号 BOM 预填）
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [生产单号, set生产单号] = useState<string | undefined>(undefined);

  const load = useCallback(async (p: number, kw: string) => {
    if (!canOpen) return;
    setLoading(true);
    try {
      const r = await productionApi.list(p, PAGE_SIZE, kw);
      setRows(r.items);
      setTotal(r.total);
    } catch { message.error("加载生产单列表失败"); }
    finally { setLoading(false); }
  }, [canOpen]);

  useEffect(() => { load(page, keyword); }, [load, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSearch = (v: string) => {
    setKeyword(v);
    if (page === 1) load(1, v);
    else setPage(1);
  };

  const openDrawer = (no?: string) => {
    if (!no) return;
    set生产单号(no);
    setDrawerOpen(true);
  };

  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;

  const columns = [
    { title: "制单日期", dataIndex: "日期", width: 110, render: d10 },
    { title: "交货日期", dataIndex: "交货日期", width: 110, render: d10 },
    {
      title: "生产单号", dataIndex: "生产单号", width: 140,
      render: (v: string) => <a className="erp-num">{v}</a>,
    },
    { title: "款号", dataIndex: "款号", width: 120 },
    { title: "款式", dataIndex: "款式", width: 140 },
    { title: "客户款号", dataIndex: "客户款号", width: 120 },
    { title: "合同号", dataIndex: "合同号", width: 120 },
    { title: "计划数量", dataIndex: "计划数量", width: 90, align: "right" as const },
    { title: "制单人", dataIndex: "制单人", width: 100 },
    { title: "审核", dataIndex: "审核", width: 90, align: "center" as const, render: 审核Tag },
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="采购物料分析" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="生产单号 / 款号 / 客户" allowClear style={{ width: 280 }}
          onSearch={onSearch}
        />
      </Space>

      <Table
        size="small" rowKey="id" loading={loading} dataSource={rows}
        columns={columns} scroll={{ x: 1180, y: "calc(100vh - 300px)" }}
        pagination={{
          current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false,
          onChange: setPage,
          showTotal: t => `共 ${t} 条`,
        }}
        onRow={r => ({ onClick: () => openDrawer(r.生产单号), style: { cursor: "pointer" } })}
      />

      <PurchaseOrderDrawer
        open={drawerOpen}
        生产单号={生产单号}
        onClose={() => setDrawerOpen(false)}
      />
    </Card>
  );
}
