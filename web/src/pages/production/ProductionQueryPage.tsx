import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card, Descriptions, Drawer, Input, Select, Space, Table, Tabs, Tag, message,
} from "antd";
import {
  productionApi, type ProductionDetail, type ProductionHeader,
} from "../../api/production";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const PAGE_SIZE = 20;
const d10 = (v?: string) => v?.slice(0, 10);

export default function ProductionQueryPage() {
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
  const [审核Filter, set审核Filter] = useState<"all" | "1" | "0">("all");
  const [完成Filter, set完成Filter] = useState<"all" | "1" | "0">("all");

  // 详情抽屉
  const [detailOpen, setDetailOpen] = useState(false);
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

  // 审核/完成 在当前页客户端过滤
  const displayRows = useMemo(() => rows.filter(r =>
    (审核Filter === "all" || (r.审核 ?? "0") === 审核Filter) &&
    (完成Filter === "all" || (r.完成 ?? "0") === 完成Filter)
  ), [rows, 审核Filter, 完成Filter]);

  const openDetail = async (单号?: string) => {
    if (!单号) return;
    setDetailOpen(true);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await productionApi.get(单号));
    } catch { message.error("加载生产单详情失败"); }
    finally { setDetailLoading(false); }
  };

  const 审核Tag = (v?: string) => v === "1"
    ? <Tag color="green">已审核</Tag> : <Tag>未审核</Tag>;
  const 完成Tag = (v?: string) => v === "1"
    ? <Tag color="blue">是</Tag> : <Tag>否</Tag>;

  const columns = [
    { title: "标识", dataIndex: "标识", width: 72 },
    {
      title: "生产单号", dataIndex: "生产单号", width: 140,
      render: (v: string) => <a className="erp-num">{v}</a>,
    },
    { title: "款号", dataIndex: "款号", width: 120 },
    { title: "款式", dataIndex: "款式", width: 140 },
    { title: "客户名称", dataIndex: "客户名称", width: 160 },
    { title: "合同号", dataIndex: "合同号", width: 120 },
    { title: "计划数量", dataIndex: "计划数量", width: 90, align: "right" as const },
    { title: "日期", dataIndex: "日期", width: 110, render: d10 },
    { title: "交货日期", dataIndex: "交货日期", width: 110, render: d10 },
    { title: "完成", dataIndex: "完成", width: 72, align: "center" as const, render: 完成Tag },
    { title: "审核", dataIndex: "审核", width: 90, align: "center" as const, render: 审核Tag },
    { title: "跟单员", dataIndex: "跟单员", width: 100 },
  ];

  const head = detail?.单头;

  // 货号明细
  const goodsColumns = [
    { title: "序号", dataIndex: "序号", width: 56 },
    { title: "货号", dataIndex: "货号", width: 140 },
    { title: "BOM款号", dataIndex: "BOM款号", width: 140 },
    { title: "款号名称", dataIndex: "款号名称" },
    { title: "数量", dataIndex: "数量", width: 90, align: "right" as const },
    { title: "比例", dataIndex: "比例", width: 80, align: "right" as const },
  ];

  const procColumns = [
    { title: "货号", dataIndex: "货号", width: 130 },
    { title: "工序号", dataIndex: "工序号", width: 90 },
    { title: "工序名称", dataIndex: "工序名称" },
    { title: "单价", dataIndex: "单价", width: 110, align: "right" as const, render: money },
    {
      title: "工序类型", dataIndex: "工序类型", width: 100,
      render: (v?: string) => v ? <Tag style={{ borderRadius: 6 }}>{v}</Tag> : null,
    },
  ];

  const matColumns = [
    { title: "货号", dataIndex: "货号", width: 120 },
    { title: "物料编号", dataIndex: "物料编号", width: 120 },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 90 },
    { title: "单位", dataIndex: "单位", width: 70 },
    { title: "总数量", dataIndex: "总数量", width: 90, align: "right" as const },
    { title: "需订数量", dataIndex: "需订数量", width: 90, align: "right" as const },
    ...(priceHidden ? [] : [
      { title: "预算单价", dataIndex: "预算单价", width: 100, align: "right" as const, render: money },
      { title: "金额", dataIndex: "金额", width: 110, align: "right" as const, render: money },
    ]),
  ];

  if (!canOpen) {
    return (
      <Card variant="borderless">
        <div style={{ padding: 24, color: "#999" }}>无权访问该页面（缺少“生产制单·打开”权限）。</div>
      </Card>
    );
  }

  return (
    <Card title="查询生产单" variant="borderless">
      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="生产单号 / 款号 / 客户" allowClear style={{ width: 280 }}
          onSearch={onSearch}
        />
        <span>审核：</span>
        <Select
          value={审核Filter} style={{ width: 120 }} onChange={set审核Filter}
          options={[
            { value: "all", label: "全部" },
            { value: "1", label: "已审核" },
            { value: "0", label: "未审核" },
          ]}
        />
        <span>完成：</span>
        <Select
          value={完成Filter} style={{ width: 120 }} onChange={set完成Filter}
          options={[
            { value: "all", label: "全部" },
            { value: "1", label: "已完成" },
            { value: "0", label: "未完成" },
          ]}
        />
      </Space>

      <Table
        size="small" rowKey="id" loading={loading} dataSource={displayRows}
        columns={columns} scroll={{ x: 1300, y: "calc(100vh - 300px)" }}
        pagination={{
          current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false,
          onChange: setPage,
          showTotal: t => `共 ${t} 条`,
        }}
        onRow={r => ({ onClick: () => openDetail(r.生产单号), style: { cursor: "pointer" } })}
      />

      <Drawer
        title={`生产单详情${head?.生产单号 ? ` · ${head.生产单号}` : ""}`}
        width={860} open={detailOpen} onClose={() => setDetailOpen(false)}
        loading={detailLoading}
      >
        {head && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="生产单号">{head.生产单号}</Descriptions.Item>
              <Descriptions.Item label="订单类型">{head.订单类型}</Descriptions.Item>
              <Descriptions.Item label="标识">{head.标识}</Descriptions.Item>
              <Descriptions.Item label="客户款号">{head.客户款号}</Descriptions.Item>
              <Descriptions.Item label="客户编号">{head.客户编号}</Descriptions.Item>
              <Descriptions.Item label="客户名称">{head.客户名称}</Descriptions.Item>
              <Descriptions.Item label="合同号">{head.合同号}</Descriptions.Item>
              <Descriptions.Item label="加工厂">{head.加工厂名称}</Descriptions.Item>
              <Descriptions.Item label="制单人">{head.制单人}</Descriptions.Item>
              <Descriptions.Item label="跟单员">{head.跟单员}</Descriptions.Item>
              <Descriptions.Item label="制单日期">{d10(head.日期)}</Descriptions.Item>
              <Descriptions.Item label="交货日期">{d10(head.交货日期)}</Descriptions.Item>
              <Descriptions.Item label="下单日期">{d10(head.下单日期)}</Descriptions.Item>
              <Descriptions.Item label="装箱方式">{head.装箱方式}</Descriptions.Item>
              <Descriptions.Item label="订单总箱数">{head.订单总箱数}</Descriptions.Item>
              <Descriptions.Item label="计划数量">{head.计划数量}</Descriptions.Item>
              <Descriptions.Item label="默认单价">{head.默认单价}</Descriptions.Item>
              <Descriptions.Item label="完成">{完成Tag(head.完成)}</Descriptions.Item>
              <Descriptions.Item label="审核">{审核Tag(head.审核)}</Descriptions.Item>
              <Descriptions.Item label="物料金额">{money(head.物料金额)}</Descriptions.Item>
              <Descriptions.Item label="备注" span={2}>{head.备注}</Descriptions.Item>
            </Descriptions>

            <Tabs
              items={[
                {
                  key: "goods", label: "货号明细",
                  children: (
                    <Table
                      size="small" rowKey={(_, i) => `g-${i}`} pagination={false}
                      dataSource={detail?.货号明细 ?? []} columns={goodsColumns}
                      scroll={{ x: "max-content", y: 380 }}
                    />
                  ),
                },
                {
                  key: "proc", label: "工序",
                  children: (
                    <Table
                      size="small" rowKey={(_, i) => `p-${i}`} pagination={false}
                      dataSource={detail?.工序 ?? []} columns={procColumns}
                      scroll={{ x: "max-content", y: 380 }}
                    />
                  ),
                },
                {
                  key: "mat", label: "物料",
                  children: (
                    <Table
                      size="small" rowKey={(_, i) => `m-${i}`} pagination={false}
                      dataSource={detail?.物料 ?? []} columns={matColumns}
                      scroll={{ x: "max-content", y: 380 }}
                    />
                  ),
                },
              ]}
            />
          </Space>
        )}
      </Drawer>
    </Card>
  );
}
