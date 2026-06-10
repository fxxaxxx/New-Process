import { useCallback, useEffect, useState } from "react";
import {
  Card, Descriptions, Drawer, Input, Space, Table, Tag, message,
} from "antd";
import {
  productionApi, type ProductionDetail, type ProductionHeader,
} from "../../api/production";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const PAGE_SIZE = 50;
const d10 = (v?: string) => v?.slice(0, 10);

export default function PurchaseMaterialAnalysisPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  // 列表查询态
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<ProductionHeader[]>([]);
  const [loading, setLoading] = useState(false);

  // 采购物料单抽屉
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detail, setDetail] = useState<ProductionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

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

  const openDrawer = async (单号?: string) => {
    if (!单号) return;
    setDrawerOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await productionApi.get(单号));
    } catch { message.error("加载采购物料单失败"); }
    finally { setDetailLoading(false); }
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

  const head = detail?.单头;
  const mats = detail?.物料 ?? [];
  const totalAmount = mats.reduce((s, m) => s + (m.金额 ?? 0), 0);

  const matColumns = [
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 90 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "总数量", dataIndex: "总数量", width: 90, align: "right" as const },
    { title: "库存数量", dataIndex: "库存数量", width: 90, align: "right" as const },
    { title: "可用库存", dataIndex: "可用库存", width: 90, align: "right" as const },
    {
      title: "需订数量", dataIndex: "需订数量", width: 100, align: "right" as const,
      render: (v?: number) => (
        <span style={{ fontWeight: 700, color: (v ?? 0) > 0 ? "#cf1322" : undefined }}>
          {v ?? 0}
        </span>
      ),
    },
    ...(priceHidden ? [] : [
      { title: "预算单价", dataIndex: "预算单价", width: 100, align: "right" as const, render: money },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: money },
    ]),
    { title: "供应商名称", dataIndex: "供应商名称", width: 160 },
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
        columns={columns} scroll={{ x: 1180 }}
        pagination={{
          current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false,
          onChange: setPage,
          showTotal: t => `共 ${t} 条`,
        }}
        onRow={r => ({ onClick: () => openDrawer(r.生产单号), style: { cursor: "pointer" } })}
      />

      <Drawer
        title={`采购物料单${head?.生产单号 ? ` · ${head.生产单号}` : ""}`}
        width={900} open={drawerOpen} onClose={() => setDrawerOpen(false)}
        loading={detailLoading}
      >
        {head && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="生产单号">{head.生产单号}</Descriptions.Item>
              <Descriptions.Item label="款号">{head.款号}</Descriptions.Item>
              <Descriptions.Item label="客户名称">{head.客户名称}</Descriptions.Item>
              <Descriptions.Item label="合同号">{head.合同号}</Descriptions.Item>
              <Descriptions.Item label="计划数量">{head.计划数量}</Descriptions.Item>
              <Descriptions.Item label="合计金额">{money(totalAmount)}</Descriptions.Item>
            </Descriptions>

            <Table
              size="small" rowKey={(_, i) => `m-${i}`} pagination={false}
              dataSource={mats} columns={matColumns}
              scroll={{ x: true }}
            />
          </Space>
        )}
      </Drawer>
    </Card>
  );
}
