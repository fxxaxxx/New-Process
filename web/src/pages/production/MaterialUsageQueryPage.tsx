import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, Col, Empty, Input, Row, Space, Table, Tag, message } from "antd";
import {
  productionApi, type ProductionDetail, type ProductionHeader,
} from "../../api/production";
import { can, hidePrice } from "../../auth/permissions";
import { usePerms } from "../../auth/PermissionContext";

const MENU = "生产制单";
const PAGE_SIZE = 50;

export default function MaterialUsageQueryPage() {
  const perms = usePerms();
  const canOpen = can(perms, MENU, "打开");
  const priceHidden = hidePrice(perms, MENU);
  const money = (v?: number | null) => (priceHidden ? "***" : (v ?? ""));

  // 左侧生产单列表态
  const [keyword, setKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<ProductionHeader[]>([]);
  const [loading, setLoading] = useState(false);

  // 右侧选中生产单 + 用料明细
  const [selected, setSelected] = useState<string | undefined>(undefined);
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

  const selectRow = async (单号?: string) => {
    if (!单号) return;
    setSelected(单号);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await productionApi.get(单号));
    } catch { message.error("加载生产单用料明细失败"); }
    finally { setDetailLoading(false); }
  };

  const mats = detail?.物料 ?? [];
  const totalAmount = useMemo(
    () => mats.reduce((s, m) => s + (m.金额 ?? 0), 0),
    [mats],
  );

  const leftColumns = [
    {
      title: "生产单号", dataIndex: "生产单号", width: 140,
      render: (v: string) => <a className="erp-num">{v}</a>,
    },
    { title: "款号", dataIndex: "款号", width: 110 },
    { title: "客户款号", dataIndex: "客户款号", width: 110 },
  ];

  const matColumns = [
    { title: "物料编号", dataIndex: "物料编号", width: 110 },
    { title: "物料名称", dataIndex: "物料名称" },
    { title: "规格", dataIndex: "规格", width: 110 },
    { title: "颜色", dataIndex: "颜色", width: 80 },
    { title: "单位", dataIndex: "单位", width: 64 },
    { title: "用量", dataIndex: "总数量", width: 90, align: "right" as const },
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
    <Row gutter={16}>
      <Col span={9}>
        <Card title="生产单列表" variant="borderless" styles={{ body: { paddingTop: 12 } }}>
          <Input.Search
            placeholder="生产单号 / 款号 / 客户" allowClear
            style={{ width: "100%", marginBottom: 12 }}
            onSearch={onSearch}
          />
          <Table
            size="small" rowKey="id" loading={loading} dataSource={rows}
            columns={leftColumns} scroll={{ x: 360 }}
            pagination={{
              current: page, pageSize: PAGE_SIZE, total, showSizeChanger: false,
              onChange: setPage,
              showTotal: t => `共 ${t} 条`,
            }}
            rowClassName={r => (r.生产单号 === selected ? "ant-table-row-selected" : "")}
            onRow={r => ({
              onClick: () => selectRow(r.生产单号),
              style: { cursor: "pointer" },
            })}
          />
        </Card>
      </Col>

      <Col span={15}>
        <Card
          title="制单用料明细"
          variant="borderless"
          styles={{ body: { paddingTop: 12 } }}
          extra={selected
            ? <Space size={16}>
                <Tag color="blue">{selected}</Tag>
                <span style={{ fontWeight: 600 }}>合计金额：{money(totalAmount)}</span>
              </Space>
            : null}
        >
          {selected ? (
            <Table
              size="small" rowKey={(_, i) => `m-${i}`} loading={detailLoading}
              dataSource={mats} columns={matColumns} scroll={{ x: 700 }}
              pagination={false}
            />
          ) : (
            <Empty
              description="请选择左侧生产单"
              style={{ padding: "48px 0" }}
            />
          )}
        </Card>
      </Col>
    </Row>
  );
}
